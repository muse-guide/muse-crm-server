import {handleError} from "./common/response-formatter";
import middy from "@middy/core";
import {id, required} from "./common/validation";
import {StateMachineInput} from "./model/common.model";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import {client} from "./clients/dynamo.client";
import {EXHIBITION_SNAPSHOT_TABLE, EXHIBITION_TABLE, TxInput} from "./model/table.model";
import {Exhibition, ExhibitionContext} from "./model/exhibition.model";
import {mapQrCodeToAssetProcessorInput, mapToAssetProcessorInput} from "./model/asset.model";

const exhibitionDeleteHandler = async (event: StateMachineInput): Promise<ExhibitionContext> => {
    try {
        const exhibitionId = id.parse(event.path?.["id"])
        const customerId = id.parse(event.sub)
        const identityId = required.parse(event.header?.["identityid"]) // TODO can we get it from cognito rather thas from FE?

        const exhibition = await client.getItem({
            table: EXHIBITION_TABLE,
            keys: {
                partitionKey: customerId,
                sortKey: exhibitionId
            }
        }) as Exhibition

        const imagesToDelete = exhibition.images.map(imageRef => mapToAssetProcessorInput(identityId, exhibitionId, imageRef, 'DELETE'))
        const qrCodeToDelete = mapQrCodeToAssetProcessorInput(identityId, exhibitionId, exhibition.qrCodeUrl, 'DELETE')

        const exhibitionTxDeleteItem = TxInput.deleteOf(EXHIBITION_TABLE, {
            partitionKey: exhibition.customerId,
            sortKey: exhibition.id
        })
        const exhibitionSnapshotKeys = exhibition.langOptions.map(option => {
            return {
                partitionKey: exhibition.id,
                sortKey: option.lang
            }
        })
        const exhibitionSnapshotTxDeleteItems = TxInput.deleteOf(EXHIBITION_SNAPSHOT_TABLE, ...exhibitionSnapshotKeys)

        await client.inTransaction(
            ...exhibitionTxDeleteItem,
            ...exhibitionSnapshotTxDeleteItems
        )

        return {
            mutation: {
                entityId: exhibition.id,
                entity: exhibition,
                action: "DELETED",
                actor: {
                    customerId: customerId,
                }
            },
            assetToProcess: imagesToDelete.concat(qrCodeToDelete)
        }
    } catch (err) {
        return handleError(err);
    }
};

export const handler = middy(exhibitionDeleteHandler);
handler
    .use(httpJsonBodyParser())
