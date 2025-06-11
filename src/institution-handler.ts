import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {nanoId, uuidId, validateArticleMarkup, validateUniqueEntries} from "./schema/validation";
import {institutionService} from "./service/institution";
import {InstitutionDto, UpsertInstitutionRequest, upsertInstitutionSchema} from "./schema/institution";
import {responseFormatter, restHandleError} from "./common/response-formatter";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import cors from "@middy/http-cors";
import {Institution} from "./model/institution";
import {articleService} from "./service/article";
import {unlockSubscription} from "./common/exception-handler";

/**
 * Handler for creating an institution.
 *
 * @param {APIGatewayProxyEvent} event - The API Gateway event.
 * @returns {Promise<APIGatewayProxyResult>} - The API Gateway response.
 */
const institutionCreate = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const request: UpsertInstitutionRequest = upsertInstitutionSchema.parse(event.body)
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)

        validateUniqueEntries(request.langOptions, "lang", "Language options not unique.")
        validateUniqueEntries(request.images, "id", "Image refs not unique.")
        request.langOptions.forEach(lang => {
            validateArticleMarkup(lang.article)
        })

        const response = await institutionService.createInstitution(customerId, request)
        return responseFormatter(200, response)
    } catch (err) {
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)
        await unlockSubscription(customerId, err)
        return restHandleError(err);
    }
};

export const institutionCreateHandler = middy(institutionCreate);
institutionCreateHandler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))

/**
 * Handler for retrieving an institution.
 *
 * @param {APIGatewayProxyEvent} event - The API Gateway event.
 * @returns {Promise<APIGatewayProxyResult>} - The API Gateway response.
 */
const institutionGet = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)
        const institution = await institutionService.findInstitutionForCustomer(customerId)
        if (!institution) return responseFormatter(200, undefined)

        const institutionWithImagesPresigned: Institution = await articleService.prepareArticleImages(institution) as Institution
        const institutionDto: InstitutionDto = mapToInstitutionDto(institutionWithImagesPresigned)

        return responseFormatter(200, institutionDto)
    } catch (err) {
        return restHandleError(err);
    }
};

export const institutionGetHandler = middy(institutionGet);
institutionGetHandler
    .use(cors())

/**
 * Handler for updating an institution.
 *
 * @param {APIGatewayProxyEvent} event - The API Gateway event.
 * @returns {Promise<APIGatewayProxyResult>} - The API Gateway response.
 */
export const institutionUpdate = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const request = upsertInstitutionSchema.parse(event.body)
        const institutionId = nanoId.parse(event.pathParameters?.["id"])
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)

        validateUniqueEntries(request.langOptions, "lang", "Language options not unique.")
        validateUniqueEntries(request.images, "name", "Image refs not unique.")
        request.langOptions.forEach(lang => {
            validateArticleMarkup(lang.article)
        })

        const response = await institutionService.updateInstitution(institutionId, customerId, request)
        return responseFormatter(200, response)
    } catch (err) {
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)
        await unlockSubscription(customerId, err)
        return restHandleError(err);
    }
}

export const institutionUpdateHandler = middy(institutionUpdate);
institutionUpdateHandler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))


const mapToInstitutionDto = (institution: Institution): InstitutionDto => {
    return {
        id: institution.id,
        referenceName: institution.referenceName,
        langOptions: institution.langOptions.map(opt => {
            const audio = opt.audio ? {
                key: `${institution.id}_${opt.lang}`,
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
        images: institution.images.map(img => {
            return {
                id: img.id,
                name: img.name
            }
        }),
        status: institution.status
    }
}