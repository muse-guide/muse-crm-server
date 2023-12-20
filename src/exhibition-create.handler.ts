import {handleError} from "./common/response-formatter";
import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {required, uuidId} from "./common/validation";
import {Exhibition, ExhibitionContext, generateSnapshot} from "./model/exhibition.model";
import {z} from "zod";
import {nid, StateMachineInput} from "./model/common.model";
import {EXHIBITION_SNAPSHOT_TABLE, EXHIBITION_TABLE, TxInput} from "./model/table.model";
import {client} from "./clients/dynamo.client";
import {mapToAssetProcessorInput} from "./model/asset.model";

const createExhibitionSchema = z.object({
    referenceName: z.string().min(1).max(64),
    institutionId: z.string().length(8),
    includeInstitutionInfo: z.boolean(),
    langOptions: z.array(z.object({
        lang: z.string().length(2),
        title: z.string().min(1).max(64),
        subtitle: z.string().min(1).max(64),
        description: z.string().min(1).max(256).optional(),
    })).nonempty(),
    images: z.array(z.object({
        key: z.string().min(1),
        name: z.string().min(1)
    }))
})

const exhibitionCreateHandler = async (event: StateMachineInput): Promise<ExhibitionContext> => {
    try {
        const request = createExhibitionSchema.parse(event.body)
        const customerId = uuidId.parse(event.sub)
        const identityId = required.parse(event.header?.["identityid"]) // TODO can we get it from cognito rather thas from FE?
        const exhibitionId = nid()

        const exhibition: Exhibition = {
            id: exhibitionId,
            customerId: customerId,
            qrCodeUrl: `exhibitions/${exhibitionId}/qr.png`,
            version: Date.now(),
            status: "ACTIVE",
            ...request
        }

        const exhibitionTxPutItem = TxInput.putOf(EXHIBITION_TABLE, exhibition)
        const exhibitionSnapshots = exhibition.langOptions.map(opt => generateSnapshot(opt, exhibition))
        const exhibitionSnapshotTxPutItems = TxInput.putOf(EXHIBITION_SNAPSHOT_TABLE, ...exhibitionSnapshots)
        const imagesToAdd = exhibition.images.map(imageRef => mapToAssetProcessorInput(identityId, exhibitionId, imageRef, 'CREATE'))

        await client.inTransaction(
            ...exhibitionTxPutItem,
            ...exhibitionSnapshotTxPutItems
        )

        return {
            mutation: {
                entityId: exhibition.id,
                entity: exhibition,
                action: "CREATED",
                actor: {
                    customerId: customerId,
                    identityId: identityId
                }
            },
            assetToProcess: imagesToAdd
        }

    } catch (err) {
        return handleError(err);
    }
};

export const handler = middy(exhibitionCreateHandler);
handler
    .use(httpJsonBodyParser())