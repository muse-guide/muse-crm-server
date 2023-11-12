import {exhibitionService} from "./clients/entity.service";
import {handleError} from "./common/response-formatter";
import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {id, validateUniqueEntries} from "./common/validation";
import {Exhibition, ExhibitionLang, ImageRef} from "./model/exhibition.model";
import {z} from "zod";
import {EMPTY_STRING, StateMachineInput} from "./model/common.model";
import {ExhibitionSnapshot} from "./model/exhibition-snapshot.model";
import {EntityStructure, EXHIBITION_SNAPSHOT_TABLE, EXHIBITION_TABLE, TxInput} from "./model/table.model";
import {client} from "./clients/dynamo-tx.client";

const updateExhibitionSchema = z.object({
    referenceName: z.string().min(1).max(64).optional(),
    includeInstitutionInfo: z.boolean().optional(),
    langOptions: z.array(z.object({
        lang: z.string().length(2),
        title: z.string().min(1).max(64),
        subtitle: z.string().min(1).max(64),
        description: z.string().min(1).max(256).optional(),
    })).optional(),
    images: z.array(z.object({
        name: z.string().min(1).max(64),
        url: z.string().min(1)
    })).optional()
})

interface UpdateExhibitionOutput {
    exhibition: Exhibition
    langOptionsToAdd: ExhibitionSnapshot[]
    langOptionsToDelete: ExhibitionSnapshot[]
    langOptionsToUpdate: ExhibitionSnapshot[]
    imagesToAdd: ImageRef[]
    imagesToDelete: ImageRef[]
    imagesToUpdate: ImageRef[]
}

const updateExhibitionTxHandler = async (event: StateMachineInput): Promise<UpdateExhibitionOutput> => {
    try {
        const request = updateExhibitionSchema.parse(event.body)
        const exhibitionId = id.parse(event.path?.["id"])
        const customerId = id.parse(event.sub)

        if (request.langOptions) validateUniqueEntries(request.langOptions, "lang", "Language options not unique.")
        if (request.images) validateUniqueEntries(request.images, "name", "Image refs not unique.")

        const exhibition = await exhibitionService.getEntity(exhibitionId, customerId)
        const exhibitionUpdated = updateAllKeys(exhibition, request) as Exhibition

        const updateExhibitionOutput: UpdateExhibitionOutput = {
            exhibition: exhibitionUpdated,
            langOptionsToAdd: [],
            langOptionsToDelete: [],
            langOptionsToUpdate: [],
            imagesToAdd: [],
            imagesToDelete: [],
            imagesToUpdate: [],
        }

        const snapshotMapper: (opt: EntityStructure) => ExhibitionSnapshot = langOption => {
            return {
                id: exhibitionUpdated.id,
                institutionId: exhibitionUpdated.institutionId,
                lang: langOption.lang,
                langOptions: exhibitionUpdated.langOptions.map(option => option.lang),
                title: langOption.title,
                subtitle: langOption.subtitle,
                description: langOption.description ?? EMPTY_STRING,
                imageUrls: exhibitionUpdated.images.map(image => image.url),
                version: exhibitionUpdated.version,
            }
        }

        if (request.langOptions) {
            updateExhibitionOutput.langOptionsToAdd = getDifferent(request.langOptions, exhibition.langOptions, "lang").map(snapshotMapper)
            updateExhibitionOutput.langOptionsToDelete = getDifferent(exhibition.langOptions, request.langOptions, "lang").map(snapshotMapper)
            updateExhibitionOutput.langOptionsToUpdate = getModifiedLangOptions(request.langOptions, exhibition.langOptions).map(snapshotMapper)
        }

        if (request.images) {
            updateExhibitionOutput.imagesToAdd = getDifferent(request.images, exhibition.images, "name") as ImageRef[]
            updateExhibitionOutput.imagesToDelete = getDifferent(exhibition.images, request.images, "name") as ImageRef[]
            updateExhibitionOutput.imagesToUpdate = getModifiedLImages(request.images, exhibition.images)
        }

        const updateExhibitionTxPutItems = TxInput.putOf(EXHIBITION_TABLE, exhibitionUpdated)
        const updateExhibitionSnapshotTxPutItems = TxInput.putOf(EXHIBITION_SNAPSHOT_TABLE, ...updateExhibitionOutput.langOptionsToAdd)
        const updateExhibitionSnapshotTxDeleteItems = TxInput.putOf(EXHIBITION_SNAPSHOT_TABLE, ...updateExhibitionOutput.langOptionsToDelete)
        const updateExhibitionSnapshotTxUpdateItems = TxInput.putOf(EXHIBITION_SNAPSHOT_TABLE, ...updateExhibitionOutput.langOptionsToUpdate)

        await client.inTransaction(
            ...updateExhibitionTxPutItems,
            ...updateExhibitionSnapshotTxPutItems,
            ...updateExhibitionSnapshotTxDeleteItems,
            ...updateExhibitionSnapshotTxUpdateItems
        )

        return updateExhibitionOutput
    } catch (err) {
        return handleError(err);
    }
};

const updateAllKeys = (entity: any, request: any) => {
    const updated: EntityStructure = JSON.parse(JSON.stringify(entity));
    for (const key of Object.keys(entity)) {
        if (request[key] != null && entity[key] != null && entity[key] !== request[key]) updated[key] = request[key]
    }
    return updated
}

const getDifferent = (arr1: EntityStructure[], arr2: EntityStructure[], key: string) => {
    return arr1.filter(
        option1 => !arr2.some(
            option2 => option1[key] === option2[key]
        ),
    )
}

const getModifiedLangOptions = (arr1: ExhibitionLang[], arr2: ExhibitionLang[]) => {
    return arr1.filter(
        option1 => arr2.some(
            option2 => option1.lang === option2.lang && (
                option1.title !== option2.title
                || option1.subtitle !== option2.subtitle
                || option1.description !== option2.description
            )
        ),
    );
}

const getModifiedLImages = (arr1: ImageRef[], arr2: ImageRef[]) => {
    return arr1.filter(
        option1 => arr2.some(
            option2 => option1.name === option2.name && option1.url !== option2.url
        ),
    );
}

export const handler = middy(updateExhibitionTxHandler);
handler
    .use(httpJsonBodyParser())