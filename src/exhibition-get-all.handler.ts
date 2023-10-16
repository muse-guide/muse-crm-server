import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';
import {exhibitionService} from "./clients/entity.service";
import {responseFormatter, restHandleError} from "./common/response-formatter";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import {id} from "./common/validation";
import {z} from "zod";

const exhibitionGetAllHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const customerId = id.parse(event.requestContext.authorizer?.claims.sub)
        const pageSize = z.coerce.number().min(1).parse(event.queryStringParameters?.["page-size"])
        const nextPageKey = event.queryStringParameters?.["next-page-key"]

        const exhibitions = await exhibitionService.getCustomerEntities(customerId, pageSize, nextPageKey)
        return responseFormatter(200, exhibitions)
    } catch (err) {
        return restHandleError(err);
    }
};

export const handler = middy(exhibitionGetAllHandler);
handler
    .use(cors())
