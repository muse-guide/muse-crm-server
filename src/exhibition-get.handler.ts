import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';
import {responseFormatter, restHandleError} from "./common/response-formatter";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import {id} from "./common/validation";
import {client} from "./clients/dynamo-tx.client";
import {EXHIBITION_TABLE} from "./model/table.model";

const exhibitionGetHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const exhibitionId = id.parse(event.pathParameters?.["id"])
        const customerId = id.parse(event.requestContext.authorizer?.claims.sub)

        const exhibition = await client.getItem({
            table: EXHIBITION_TABLE,
            keys: {
                partitionKey: exhibitionId,
                sortKey: customerId
            }
        })

        return responseFormatter(200, exhibition)
    } catch (err) {
        return restHandleError(err);
    }
};

export const handler = middy(exhibitionGetHandler);
handler
    .use(cors())
