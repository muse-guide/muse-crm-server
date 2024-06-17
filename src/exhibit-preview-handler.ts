import middy from "@middy/core";
import {nanoId, required} from "./schema/validation";
import {responseFormatter, restHandleError} from "./common/response-formatter";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import cors from "@middy/http-cors";
import {exhibitPreviewService} from "./service/exhibit-preview";
import {z} from "zod";
import {logger} from "./common/logger";

/**
 * Gets exhibits for exhibition by ID for app
 *
 * @param event - The API Gateway proxy event
 * @returns The API Gateway proxy result with exhibits data
 */
const exhibitPreviewsGet = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        logger.info("Getting exhibit previews")
        const exhibitionId = nanoId.parse(event.pathParameters?.["id"])
        const numberFromRequest = event.queryStringParameters?.["number"] ? parseInt(event.queryStringParameters?.["number"]) : undefined
        const number = z.number().min(1).optional().parse(numberFromRequest)
        const lang = required.parse(event.queryStringParameters?.["lang"])

        const filters = {exhibitionId, lang, number}
        const pagination = {
            pageSize: z.coerce.number().optional().parse(event.queryStringParameters?.["page-size"]) ?? 10,
            nextPageKey: event.queryStringParameters?.["next-page-key"]
        }

        const exhibit = await exhibitPreviewService.getExhibitPreviewsFor(pagination, filters)
        return responseFormatter(200, exhibit)
    } catch (err) {
        return restHandleError(err);
    }
};


export const exhibitPreviewsGetHandler = middy(exhibitPreviewsGet);
exhibitPreviewsGetHandler
    .use(cors())

/**
 * Gets an exhibit by ID for app
 *
 * @param event - The API Gateway proxy event
 * @returns The API Gateway proxy result with exhibit data
 */
const exhibitPreviewGet = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        logger.info("Getting single exhibit preview")
        const exhibitId = nanoId.parse(event.pathParameters?.["id"])
        const lang = required.parse(event.queryStringParameters?.["lang"])

        const exhibit = await exhibitPreviewService.getExhibitPreview(exhibitId, lang)
        return responseFormatter(200, exhibit)
    } catch (err) {
        return restHandleError(err);
    }
};

export const exhibitPreviewGetHandler = middy(exhibitPreviewGet);
exhibitPreviewGetHandler
    .use(cors())