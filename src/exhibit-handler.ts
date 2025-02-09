import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {nanoId, uuidId, validateArticleMarkup, validateAudioCharacterCount, validateUniqueEntries} from "./schema/validation";
import {ExhibitionsFilter, exhibitService} from "./service/exhibit";
import {CreateExhibitDto, createExhibitSchema, ExhibitDto, updateExhibitSchema} from "./schema/exhibit";
import {responseFormatter, restHandleError} from "./common/response-formatter";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import cors from "@middy/http-cors";
import {z} from "zod";
import {articleService} from "./service/article";
import {Exhibit} from "./model/exhibit";
import {convertStringToNumber} from "./service/common";
import {PaginatedDtoResults} from "./schema/common";

/**
 * Creates a new exhibit
 *
 * @param event - The API Gateway proxy event containing exhibit data
 * @returns ExhibitMutationResponseDto with created exhibit
 */
const exhibitCreate = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const request: CreateExhibitDto = createExhibitSchema.parse(event.body)
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)

        validateUniqueEntries(request.langOptions, "lang", "Language options not unique.")
        validateUniqueEntries(request.images, "id", "Image refs not unique.")
        request.langOptions.forEach(lang => {
            validateAudioCharacterCount(lang.audio?.markup)
            validateArticleMarkup(lang.article)
        })

        const response = await exhibitService.createExhibit(customerId, request)
        return responseFormatter(200, response)
    } catch (err) {
        return restHandleError(err);
    }
};

export const exhibitCreateHandler = middy(exhibitCreate);
exhibitCreateHandler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))

/**
 * Gets an exhibit by ID and customer ID
 *
 * @param event - The API Gateway proxy event
 * @returns The API Gateway proxy result with exhibit data
 */
const exhibitGet = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const exhibitId = nanoId.parse(event.pathParameters?.["id"])
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)
        const exhibit = await exhibitService.getExhibitForCustomer(exhibitId, customerId)
        const exhibitWithImagesPresigned = await articleService.prepareArticleImages(exhibit) as Exhibit
        const exhibitDto = mapToExhibitDto(exhibitWithImagesPresigned)

        return responseFormatter(200, exhibitDto)
    } catch (err) {
        return restHandleError(err);
    }
};

export const exhibitGetHandler = middy(exhibitGet);
exhibitGetHandler
    .use(cors())


/**
 * Gets all exhibits for a customer
 *
 * @param event - The API Gateway proxy event containing the customer ID
 * @returns The API Gateway proxy result with a paginated list of exhibits
 */
const exhibitGetAll = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)

        const filters: ExhibitionsFilter = {
            exhibitionId: event.queryStringParameters?.["exhibition-id"],
            referenceNameLike: event.queryStringParameters?.["reference-name-like"]
        }

        const pagination = {
            pageSize: z.coerce.number().optional().parse(event.queryStringParameters?.["page-size"]) ?? 10,
            nextPageKey: event.queryStringParameters?.["next-page-key"]
        }

        const exhibitsPaginated = await exhibitService.searchExhibitsForCustomer(customerId, pagination, filters)
        const response: PaginatedDtoResults = {
            ...exhibitsPaginated,
            items: exhibitsPaginated.items.map(exhibit => mapToExhibitDto(exhibit))
        }

        return responseFormatter(200, response)
    } catch (err) {
        return restHandleError(err);
    }
};

export const exhibitGetAllHandler = middy(exhibitGetAll);
exhibitGetAllHandler
    .use(cors())


/**
 * Deletes an exhibit
 *
 * @param event - The API Gateway proxy event containing exhibit ID
 * @returns ExhibitMutationResponseDto with deleted exhibit
 */
const exhibitDelete = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const exhibitId = nanoId.parse(event.pathParameters?.["id"])
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)

        const response = await exhibitService.deleteExhibit(exhibitId, customerId)
        return responseFormatter(200, response)
    } catch (err) {
        return restHandleError(err);
    }
};

export const exhibitDeleteHandler = middy(exhibitDelete);
exhibitDeleteHandler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))

/**
 * Updates an existing exhibit
 *
 * @param event - The API Gateway proxy event containing updated exhibit data
 * @returns ExposableMutation with updated exhibit
 */
export const exhibitUpdate = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const request = updateExhibitSchema.parse(event.body)
        const exhibitId = nanoId.parse(event.pathParameters?.["id"])
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)

        validateUniqueEntries(request.langOptions, "lang", "Language options not unique.")
        validateUniqueEntries(request.images, "id", "Image refs not unique.")
        request.langOptions.forEach(lang => {
            validateAudioCharacterCount(lang.audio?.markup)
            validateArticleMarkup(lang.article)
        })

        const response = await exhibitService.updateExhibit(exhibitId, customerId, request)
        return responseFormatter(200, response)
    } catch (err) {
        return restHandleError(err);
    }
}

export const exhibitUpdateHandler = middy(exhibitUpdate);
exhibitUpdateHandler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))


const mapToExhibitDto = (exhibit: Exhibit): ExhibitDto => {
    return {
        id: exhibit.id,
        exhibitionId: exhibit.exhibitionId,
        referenceName: exhibit.referenceName,
        number: convertStringToNumber(exhibit.number),
        langOptions: exhibit.langOptions.map(opt => {
            const audio = opt.audio ? {
                key: `${exhibit.id}_${opt.lang}`,
                markup: opt.audio.markup,
                voice: opt.audio.voice,
            } : undefined

            return {
                lang: opt.lang,
                title: opt.title,
                subtitle: opt.subtitle,
                article: opt.article,
                audio: audio
            }
        }),
        images: exhibit.images.map(img => {
            return {
                id: img.id,
                name: img.name
            }
        }),
        status: exhibit.status
    };
}