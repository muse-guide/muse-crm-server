import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';
import {exhibitionService} from "./clients/entity.service";
import {responseFormatter, restHandleError} from "./common/response-formatter";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import {id} from "./common/validation";

const exhibitionGetHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const exhibitionId = id.parse(event.pathParameters?.["id"])
        const customerId = id.parse(event.requestContext.authorizer?.claims.sub)

        const exhibition = await exhibitionService.getEntity(exhibitionId, customerId)
        return responseFormatter(200, exhibition)
    } catch (err) {
        return restHandleError(err);
    }
};

export const handler = middy(exhibitionGetHandler);
handler
    .use(cors())
