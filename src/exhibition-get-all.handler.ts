import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';
import {responseFormatter, restHandleError} from "./common/response-formatter";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import {id} from "./common/validation";
import {z} from "zod";
import {client} from "./clients/dynamo.client";
import {EXHIBITION_TABLE} from "./model/table.model";

const DEFAULT_PAGE_SIZE = 10

const exhibitionGetAllHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const customerId = id.parse(event.requestContext.authorizer?.claims.sub)
        const pageSize = z.coerce.number().optional().parse(event.queryStringParameters?.["page-size"])
        const nextPageKey = event.queryStringParameters?.["next-page-key"]

        const exhibitions = await client.getItemsPaginated({
            table: EXHIBITION_TABLE,
            keys: {
                partitionKey: customerId
            },
            pagination: {
                pageSize: pageSize ?? DEFAULT_PAGE_SIZE,
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
