import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';
import {responseFormatter, restHandleError} from "./common/response-formatter";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import {nanoId, uuidId} from "./common/validation";
import {client} from "./clients/dynamo.client";
import {EXHIBITION_TABLE} from "./model/table.model";

const exhibitionGetHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const exhibitionId = nanoId.parse(event.pathParameters?.["id"])
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)

        const exhibition = await client.getItem({
            table: EXHIBITION_TABLE,
            keys: {
                partitionKey: customerId,
                sortKey: exhibitionId
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
