import middy from "@middy/core";
import {nanoId, required} from "./schema/validation";
import {responseFormatter, restHandleError} from "./common/response-formatter";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import cors from "@middy/http-cors";
import {exhibitionPreviewService} from "./service/exhibition-preview";
import {ExhibitionPreview} from "./model/exhibition";
import {ExhibitionPreviewDto} from "./schema/exhibition-preview";
import {logger} from "./common/logger";
import {z} from "zod";
import {PaginatedDtoResults} from "./schema/common";

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
        const exhibition = await exhibitionPreviewService.getExhibitionPreview(exhibitionId, lang)
        const exhibitionDto = mapToExhibitionPreviewDto(exhibition)

        return responseFormatter(200, exhibitionDto)
    } catch (err) {
        return restHandleError(err);
    }
};

export const exhibitionPreviewGetHandler = middy(exhibitionPreviewGet);
exhibitionPreviewGetHandler
    .use(cors())


/**
 * Gets an exhibitions by institution id for app
 *
 * @param event - The API Gateway proxy event
 * @returns The API Gateway proxy result with exhibition data
 */
const exhibitionPreviewsGet = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        logger.info("Getting exhibition previews")
        const institutionId = nanoId.parse(event.pathParameters?.["id"])
        const lang = required.parse(event.queryStringParameters?.["lang"])

        const filters = {institutionId, lang}
        const pagination = {
            pageSize: z.coerce.number().optional().parse(event.queryStringParameters?.["page-size"]) ?? 10,
            nextPageKey: event.queryStringParameters?.["next-page-key"]
        }

        const exhibitionsPaginated = await exhibitionPreviewService.getExhibitionPreviewsFor(pagination, filters)
        const response: PaginatedDtoResults = {
            ...exhibitionsPaginated,
            items: exhibitionsPaginated.items.map(exhibition => mapToExhibitionPreviewDto(exhibition))
        }

        return responseFormatter(200, response)
    } catch (err) {
        return restHandleError(err);
    }
};

export const exhibitionPreviewsGetHandler = middy(exhibitionPreviewsGet);
exhibitionPreviewsGetHandler
    .use(cors())


const mapToExhibitionPreviewDto = (exhibition: ExhibitionPreview): ExhibitionPreviewDto => {
    return {
        id: exhibition.id,
        institutionId: exhibition.institutionId,
        lang: exhibition.lang,
        langOptions: exhibition.langOptions,
        title: exhibition.title,
        subtitle: exhibition.subtitle,
        article: exhibition.article,
        imageUrls: exhibition.imageUrls,
        audio: exhibition.audio
    }
}