import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from 'aws-lambda';
import {exhibitionService} from "./services/exhibitions.service";
import {handleError, responseFormatter} from "./common/response-formatter";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import {injectLambdaContext} from "@aws-lambda-powertools/logger";
import {logger} from "./common/logger";
import {z} from "zod";
import {id} from "./common/validation";

const getExhibitionHandler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    try {
        logger.info(`Received request, path: ${event.path}, method: ${event.httpMethod}`)
        const exhibitionId = id.parse(event.pathParameters?.["id"])
        const customerId = id.parse(event.requestContext.authorizer?.claims.sub)

        const exhibition = await exhibitionService.getExhibition(exhibitionId, customerId)
        return responseFormatter(200, exhibition)
    } catch (err) {
        return handleError(err);
    }
};

export const handler = middy(getExhibitionHandler);
handler
    .use(cors())
    .use(injectLambdaContext(logger, {logEvent: true}));