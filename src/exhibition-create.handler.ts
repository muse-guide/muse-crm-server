import {handleError} from "./common/response-formatter";
import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {id} from "./common/validation";
import {Exhibition, ExhibitionMutationOutput, mutationDefaults} from "./model/exhibition.model";
import {v4 as uuidv4} from 'uuid';
import {z} from "zod";
import {StateMachineInput} from "./model/common.model";
import {ExhibitionSnapshot} from "./model/exhibition-snapshot.model";
import {EXHIBITION_SNAPSHOT_TABLE, EXHIBITION_TABLE, TxInput} from "./model/table.model";
import {client} from "./clients/dynamo.client";

const createExhibitionSchema = z.object({
    referenceName: z.string().min(1).max(64),
    institutionId: z.string().uuid(),
    includeInstitutionInfo: z.boolean(),
    langOptions: z.array(z.object({
        lang: z.string().length(2),
        title: z.string().min(1).max(64),
        subtitle: z.string().min(1).max(64),
        description: z.string().min(1).max(256).optional(),
    })).nonempty(),
    images: z.array(z.object({
        name: z.string().min(1).max(64),
        url: z.string().url()
    }))
})

export interface CreateExhibitionOutput {
    exhibition: Exhibition,
    exhibitionSnapshots: ExhibitionSnapshot[]
}

const exhibitionCreateHandler = async (event: StateMachineInput): Promise<CreateExhibitionOutput> => {
    try {
        const request = createExhibitionSchema.parse(event.body)
        const customerId = id.parse(event.sub)

        const exhibition: Exhibition = {
            id: uuidv4(),
            customerId: customerId,
            qrCodeUrl: "/asset/qr.png",
            version: Date.now(),
            ...request
        }

        const institutionId = exhibition.includeInstitutionInfo ? exhibition.institutionId : undefined
        const langOptions = exhibition.langOptions.map(option => option.lang)
        const imageUrls = exhibition.images.map(image => image.url)

        const exhibitionSnapshots: Array<ExhibitionSnapshot> = exhibition.langOptions
            .map(langOption => {
                return {
                    id: exhibition.id,
                    institutionId: institutionId,
                    lang: langOption.lang,
                    langOptions: langOptions,
                    title: langOption.title,
                    subtitle: langOption.subtitle,
                    description: langOption.description,
                    imageUrls: imageUrls,
                    version: exhibition.version,
                }
            })

        const updateExhibitionOutput: ExhibitionMutationOutput = {
            exhibition: exhibition,
            ...mutationDefaults
        }

        const exhibitionTxPutItem = TxInput.putOf(EXHIBITION_TABLE, exhibition)
        const exhibitionSnapshotTxPutItems = TxInput.putOf(EXHIBITION_SNAPSHOT_TABLE, ...exhibitionSnapshots)

        await client.inTransaction(
            ...exhibitionTxPutItem,
            ...exhibitionSnapshotTxPutItems
        )

        return {
            exhibition: exhibition,
            exhibitionSnapshots: exhibitionSnapshots
        }

    } catch (err) {
        return handleError(err);
    }
};

export const handler = middy(exhibitionCreateHandler);
handler
    .use(httpJsonBodyParser())