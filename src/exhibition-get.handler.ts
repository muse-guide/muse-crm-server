import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';
import {responseFormatter, restHandleError} from "./common/response-formatter";
import middy from "@middy/core";
import cors from "@middy/http-cors";
import {nanoId, uuidId} from "./schema/validation";
import {exhibitService} from "./service/exhibition.service";

const exhibitionGetHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const exhibitionId = nanoId.parse(event.pathParameters?.["id"])
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)
        const exhibition = await exhibitService.getExhibitionForCustomer(exhibitionId, customerId)

        return responseFormatter(200, exhibition)
    } catch (err) {
        return restHandleError(err);
    }
};

export const handler = middy(exhibitionGetHandler);
handler
    .use(cors())
