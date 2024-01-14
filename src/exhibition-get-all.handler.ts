import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';
import {responseFormatter, restHandleError} from "./common/response-formatter";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import {uuidId} from "./schema/validation";
import {z} from "zod";
import {exhibitService} from "./service/exhibition.service";

const DEFAULT_PAGE_SIZE = 10

const exhibitionGetAllHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)
        const pageSize = z.coerce.number().optional().parse(event.queryStringParameters?.["page-size"])
        const nextPageKey = event.queryStringParameters?.["next-page-key"]
        const exhibitions = await exhibitService.getExhibitionsForCustomer(customerId, {
            pageSize: pageSize ?? DEFAULT_PAGE_SIZE,
            nextPageKey: nextPageKey
        })

        return responseFormatter(200, exhibitions)
    } catch (err) {
        return restHandleError(err);
    }
};

export const handler = middy(exhibitionGetAllHandler);
handler
    .use(cors())
