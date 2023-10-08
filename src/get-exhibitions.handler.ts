import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';
import {exhibitionService} from "./services/entity.service";
import {responseFormatter, restHandleError} from "./common/response-formatter";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import {logger} from "./common/logger";
import {id} from "./common/validation";
import {z} from "zod";

const getExhibitionsHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        logger.info(`Received request, path: ${event.path}, method: ${event.httpMethod}`)
        const customerId = id.parse(event.requestContext.authorizer?.claims.sub)
        const pageSize = z.coerce.number().min(1).parse(event.queryStringParameters?.["page-size"])
        const nextPageKey = event.queryStringParameters?.["next-page-key"]

        const exhibitions = await exhibitionService.getCustomerEntities(customerId, pageSize, nextPageKey)
        return responseFormatter(200, exhibitions)
    } catch (err) {
        return restHandleError(err);
    }
};

export const handler = middy(getExhibitionsHandler);
handler
    .use(cors())
