import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from 'aws-lambda';
import {exhibitionService} from "./services/entity.service";
import {responseFormatter, restHandleError} from "./common/response-formatter";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import {injectLambdaContext} from "@aws-lambda-powertools/logger";
import {logger} from "./common/logger";
import {id} from "./common/validation";

const getExhibitionHandler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    try {
        logger.info(`Received request, path: ${event.path}, method: ${event.httpMethod}`)
        const exhibitionId = id.parse(event.pathParameters?.["id"])
        const customerId = id.parse(event.requestContext.authorizer?.claims.sub)

        const exhibition = await exhibitionService.getEntity(exhibitionId, customerId)
        return responseFormatter(200, exhibition)
    } catch (err) {
        return restHandleError(err);
    }
};

export const handler = middy(getExhibitionHandler);
handler
    .use(cors())
