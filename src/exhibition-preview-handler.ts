import middy from "@middy/core";
import {nanoId, required} from "./schema/validation";
import {responseFormatter, restHandleError} from "./common/response-formatter";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import cors from "@middy/http-cors";
import {exhibitPreviewService} from "./service/exhibition-preview";

/**
 * Gets an exhibition by ID for app
 *
 * @param event - The API Gateway proxy event
 * @returns The API Gateway proxy result with exhibition data
 */
const exhibitionPreviewGet = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const exhibitionId = nanoId.parse(event.pathParameters?.["id"])
        const lang = required.parse(event.queryStringParameters?.["lang"])
        const exhibition = await exhibitPreviewService.getExhibitionPreview(exhibitionId, lang)

        return responseFormatter(200, exhibition)
    } catch (err) {
        return restHandleError(err);
    }
};

export const exhibitionPreviewGetHandler = middy(exhibitionPreviewGet);
exhibitionPreviewGetHandler
    .use(cors())
