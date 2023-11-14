import {handleError} from "./common/response-formatter";
import middy from "@middy/core";
import {id} from "./common/validation";
import {StateMachineInput} from "./model/common.model";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import {client} from "./clients/dynamo.client";
import {EXHIBITION_SNAPSHOT_TABLE, EXHIBITION_TABLE, TxInput} from "./model/table.model";
import {Exhibition, ExhibitionId} from "./model/exhibition.model";

const exhibitionDeleteHandler = async (event: StateMachineInput): Promise<ExhibitionId> => {
    try {
        const exhibitionId = id.parse(event.path?.["id"])
        const customerId = id.parse(event.sub)
        const exhibition = await client.getItem({
            table: EXHIBITION_TABLE,
            keys: {
                partitionKey: exhibitionId,
                sortKey: customerId
            }
        }) as Exhibition

        const exhibitionTxDeleteItem = TxInput.deleteOf(EXHIBITION_TABLE, {
            partitionKey: exhibition.id,
            sortKey: exhibition.customerId
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
            id: exhibitionId,
            customerId: customerId
        }
    } catch (err) {
        return handleError(err);
    }
};

export const handler = middy(exhibitionDeleteHandler);
handler
    .use(httpJsonBodyParser())
