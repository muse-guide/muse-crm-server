import {handleError} from "./common/response-formatter";
import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {nanoId, required, uuidId, validateUniqueEntries} from "./common/validation";
import {Exhibition, ExhibitionContext, ExhibitionLang, generateSnapshot} from "./model/exhibition.model";
import {z} from "zod";
import {StateMachineInput} from "./model/common.model";
import {EntityStructure, EXHIBITION_SNAPSHOT_TABLE, EXHIBITION_TABLE, TxInput} from "./model/table.model";
import {client} from "./clients/dynamo.client";
import {ImageRef, mapToAssetProcessorInput} from "./model/asset.model";

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
        key: z.string().min(1),
        name: z.string().min(1)
    })).optional()
})

export const updateExhibitionTxHandler = async (event: StateMachineInput): Promise<ExhibitionContext> => {
    try {
        const request = updateExhibitionSchema.parse(event.body)
        const exhibitionId = nanoId.parse(event.path?.["id"])
        const customerId = uuidId.parse(event.sub)
        const identityId = required.parse(event.header?.["identityid"]) // TODO can we get it from cognito rather thas from FE?

        if (request.langOptions) validateUniqueEntries(request.langOptions, "lang", "Language options not unique.")
        if (request.images) validateUniqueEntries(request.images, "name", "Image refs not unique.")
        const requestLangOptions = request.langOptions ?? []
        const requestImages = request.images ?? []

        const exhibition = await client.getItem({
            table: EXHIBITION_TABLE,
            keys: {
                partitionKey: customerId,
                sortKey: exhibitionId
            }
        }) as Exhibition

        const exhibitionUpdated = updateAllKeys(exhibition, request) as Exhibition
        exhibitionUpdated.version = Date.now()

        const snapshotsToProcess = resolveSnapshotsToProcess(requestLangOptions, exhibition, exhibitionUpdated)
        await client.inTransaction(...snapshotsToProcess)

        const imagesToProcess = resolveImageToProcess(identityId, exhibitionId, requestImages, exhibition.images)

        return {
            mutation: {
                entityId: exhibitionUpdated.id,
                entity: exhibitionUpdated,
                action: "UPDATED",
                actor: {
                    customerId: customerId,
                    identityId: identityId
                }
            },
            assetToProcess: imagesToProcess,
        }
    } catch
        (err) {
        return handleError(err);
    }
}

const resolveSnapshotsToProcess = (langOptions: ExhibitionLang[], exhibition: Exhibition, exhibitionUpdated: Exhibition): TxInput[] => {
    const exhibitionSnapshotsToAdd = getDifferent(langOptions, exhibition.langOptions)
        .map(opt => generateSnapshot(opt as ExhibitionLang, exhibitionUpdated))

    const exhibitionSnapshotsToUpdate = getSame(langOptions, exhibition.langOptions)
        .map(opt => generateSnapshot(opt as ExhibitionLang, exhibitionUpdated))

    const exhibitionSnapshotsToDelete = getDifferent(exhibition.langOptions, langOptions)
        .map(opt => generateSnapshot(opt as ExhibitionLang, exhibitionUpdated))
    const exhibitionSnapshotKeysToDelete = exhibitionSnapshotsToDelete.map(opt => {
        return {partitionKey: opt.id, sortKey: opt.lang}
    })

    const updateExhibitionTxPutItems = TxInput.updateOf(EXHIBITION_TABLE, exhibitionUpdated)
    const updateExhibitionSnapshotTxPutItems = TxInput.putOf(EXHIBITION_SNAPSHOT_TABLE, ...exhibitionSnapshotsToAdd)
    const updateExhibitionSnapshotTxDeleteItems = TxInput.deleteOf(EXHIBITION_SNAPSHOT_TABLE, ...exhibitionSnapshotKeysToDelete)
    const updateExhibitionSnapshotTxUpdateItems = TxInput.updateOf(EXHIBITION_SNAPSHOT_TABLE, ...exhibitionSnapshotsToUpdate)

    return [
        ...updateExhibitionTxPutItems,
        ...updateExhibitionSnapshotTxPutItems,
        ...updateExhibitionSnapshotTxDeleteItems,
        ...updateExhibitionSnapshotTxUpdateItems
    ]

}

const resolveImageToProcess = (identityId: string, exhibitionId: string, requestImages: ImageRef[], existingImages: ImageRef[]) => {
    const imagesToAdd = getDifferent(requestImages, existingImages, "key")
        .map(image => mapToAssetProcessorInput(identityId, exhibitionId, image as ImageRef, 'CREATE'))
    const imagesToDelete = getDifferent(existingImages, requestImages, "key")
        .map(image => mapToAssetProcessorInput(identityId, exhibitionId, image as ImageRef, 'DELETE'))

    return imagesToAdd.concat(imagesToDelete)
}


const updateAllKeys = (entity: any, request: any) => {
    const updated: EntityStructure = JSON.parse(JSON.stringify(entity));
    for (const key of Object.keys(entity)) {
        if (request[key] != null && entity[key] != null && entity[key] !== request[key]) updated[key] = request[key]
    }
    return updated
}

const getDifferent = (arr1: EntityStructure[], arr2: EntityStructure[], key: string = "lang") => {
    return arr1.filter(
        option1 => !arr2.some(
            option2 => option1[key] === option2[key]
        ),
    )
}

const getSame = (arr1: EntityStructure[], arr2: EntityStructure[], key: string = "lang") => {
    return arr1.filter(
        option1 => arr2.some(
            option2 => option1[key] === option2[key]
        ),
    )
}

export const handler = middy(updateExhibitionTxHandler);
handler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))