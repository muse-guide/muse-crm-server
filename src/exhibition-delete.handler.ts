import {handleError} from "./common/response-formatter";
import middy from "@middy/core";
import {id} from "./common/validation";
import {StateMachineInput} from "./model/common.model";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import {client} from "./clients/dynamo-tx.client";
import {EXHIBITION_SNAPSHOT_TABLE, EXHIBITION_TABLE, TxInput} from "./model/table.model";
import {ExhibitionId} from "./model/exhibition.model";

const exhibitionDeleteHandler = async (event: StateMachineInput): Promise<ExhibitionId> => {
    try {
        const exhibitionId = id.parse(event.path?.["id"])
        const customerId = id.parse(event.sub)

        const exhibitionTxDeleteItem = TxInput.deleteOf(EXHIBITION_TABLE, {
            partitionKey: exhibitionId,
            sortKey: customerId
        })
        const exhibitionSnapshotTxDeleteItems = TxInput.deleteOf(EXHIBITION_SNAPSHOT_TABLE, {
            partitionKey: exhibitionId,
        })

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
