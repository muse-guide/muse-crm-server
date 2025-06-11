import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {nanoId, uuidId, validateArticleMarkup, validateUniqueEntries} from "./schema/validation";
import {exhibitionService, ExhibitionsFilter} from "./service/exhibition";
import {CreateExhibitionRequest, createExhibitionSchema, ExhibitionDto, updateExhibitionSchema} from "./schema/exhibition";
import {responseFormatter, restHandleError} from "./common/response-formatter";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import cors from "@middy/http-cors";
import {z} from "zod";
import {articleService} from "./service/article";
import {Exhibition} from "./model/exhibition";
import {PaginatedDtoResults} from "./schema/common";
import {unlockSubscription} from "./common/exception-handler";

/**
 * Creates a new exhibition
 *
 * @param event - The API Gateway proxy event containing exhibition data
 * @returns ExposableMutation with created exhibition
 */
const exhibitionCreate = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const request: CreateExhibitionRequest = createExhibitionSchema.parse(event.body)
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)

        validateUniqueEntries(request.langOptions, "lang", "Language options not unique.")
        validateUniqueEntries(request.images, "id", "Image refs not unique.")
        request.langOptions.forEach(lang => {
            validateArticleMarkup(lang.article)
        })

        const response = await exhibitionService.createExhibition(customerId, request)
        return responseFormatter(200, response)
    } catch (err) {
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)
        await unlockSubscription(customerId, err)
        return restHandleError(err);
    }
};

export const exhibitionCreateHandler = middy(exhibitionCreate);
exhibitionCreateHandler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))

/**
 * Gets an exhibition by ID and customer ID
 *
 * @param event - The API Gateway proxy event
 * @returns The API Gateway proxy result with exhibition data
 */
const exhibitionGet = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const exhibitionId = nanoId.parse(event.pathParameters?.["id"])
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)
        const exhibition = await exhibitionService.getExhibitionForCustomer(exhibitionId, customerId)
        const exhibitionWithImagesPresigned = await articleService.prepareArticleImages(exhibition) as Exhibition
        const exhibitionDto = mapToExhibitionDto(exhibitionWithImagesPresigned)

        return responseFormatter(200, exhibitionDto)
    } catch (err) {
        return restHandleError(err);
    }
};

export const exhibitionGetHandler = middy(exhibitionGet);
exhibitionGetHandler
    .use(cors())

/**
 * Gets all exhibitions for a customer
 *
 * @param event - The API Gateway proxy event containing the customer ID
 * @returns The API Gateway proxy result with a paginated list of exhibitions
 */
const exhibitionGetAll = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)
        const filters: ExhibitionsFilter = {
            referenceNameLike: event.queryStringParameters?.["reference-name-like"]
        }

        const pagination = {
            pageSize: z.coerce.number().optional().parse(event.queryStringParameters?.["page-size"]) ?? 10,
            nextPageKey: event.queryStringParameters?.["next-page-key"]
        }

        const exhibitionsPaginated = await exhibitionService.searchExhibitionsForCustomer(customerId, pagination, filters)
        const response: PaginatedDtoResults = {
            ...exhibitionsPaginated,
            items: exhibitionsPaginated.items.map(exhibition => mapToExhibitionDto(exhibition))
        }

        return responseFormatter(200, response)
    } catch (err) {
        return restHandleError(err);
    }
};

export const exhibitionGetAllHandler = middy(exhibitionGetAll);
exhibitionGetAllHandler
    .use(cors())

/**
 * Deletes an exhibition
 *
 * @param event - The API Gateway proxy event containing exhibition ID
 * @returns ExposableMutation with deleted exhibition
 */
const exhibitionDelete = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const exhibitionId = nanoId.parse(event.pathParameters?.["id"])
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)

        const response = await exhibitionService.deleteExhibition(exhibitionId, customerId)
        return responseFormatter(200, response)
    } catch (err) {
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)
        await unlockSubscription(customerId, err)
        return restHandleError(err);
    }
};

export const exhibitionDeleteHandler = middy(exhibitionDelete);
exhibitionDeleteHandler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))


/**
 * Updates an existing exhibition
 *
 * @param event - The API Gateway proxy event containing updated exhibition data
 * @returns ExposableMutation with updated exhibition
 */
export const exhibitionUpdate = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const request = updateExhibitionSchema.parse(event.body)
        const exhibitionId = nanoId.parse(event.pathParameters?.["id"])
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)

        validateUniqueEntries(request.langOptions, "lang", "Language options not unique.")
        validateUniqueEntries(request.images, "name", "Image refs not unique.")
        request.langOptions.forEach(lang => {
            validateArticleMarkup(lang.article)
        })

        const response = await exhibitionService.updateExhibition(exhibitionId, customerId, request)
        return responseFormatter(200, response)
    } catch (err) {
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)
        await unlockSubscription(customerId, err)
        return restHandleError(err);
    }
}

export const exhibitionUpdateHandler = middy(exhibitionUpdate);
exhibitionUpdateHandler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))


const mapToExhibitionDto = (exhibition: Exhibition): ExhibitionDto => {
    return {
        id: exhibition.id,
        institutionId: exhibition.institutionId,
        referenceName: exhibition.referenceName,
        langOptions: exhibition.langOptions.map(opt => {
            const audio = opt.audio ? {
                key: `${exhibition.id}_${opt.lang}`,
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
        images: exhibition.images.map(img => {
            return {
                id: img.id,
                name: img.name
            }
        }),
        status: exhibition.status
    };
}