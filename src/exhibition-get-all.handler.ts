import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';
import {responseFormatter, restHandleError} from "./common/response-formatter";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import {id} from "./common/validation";
import {z} from "zod";
import {client} from "./clients/dynamo-tx.client";
import {EXHIBITION_TABLE} from "./model/table.model";

const exhibitionGetAllHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const customerId = id.parse(event.requestContext.authorizer?.claims.sub)
        const pageSize = z.coerce.number().min(1).parse(event.queryStringParameters?.["page-size"])
        const nextPageKey = event.queryStringParameters?.["next-page-key"]

        const exhibitions = await client.getItemsPaginated({
            table: EXHIBITION_TABLE,
            keys: {
                partitionKey: customerId
            },
            pagination: {
                pageSize: pageSize,
                nextPageKey: nextPageKey
            }
        })
        return responseFormatter(200, exhibitions)
    } catch (err) {
        return restHandleError(err);
    }
};

export const handler = middy(exhibitionGetAllHandler);
handler
    .use(cors())
