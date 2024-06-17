import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {nanoId, required, uuidId, validateUniqueEntries} from "./schema/validation";
import {exhibitionService, ExhibitionsFilter} from "./service/exhibition";
import {CreateExhibitionDto, createExhibitionSchema, updateExhibitionSchema} from "./schema/exhibition";
import {responseFormatter, restHandleError} from "./common/response-formatter";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import cors from "@middy/http-cors";
import {z} from "zod";

/**
 * Creates a new exhibition
 *
 * @param event - The API Gateway proxy event containing exhibition data
 * @returns ExposableMutation with created exhibition
 */
const exhibitionCreate = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const request: CreateExhibitionDto = createExhibitionSchema.parse(event.body)
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)
        const identityId = required.parse(event.headers?.["identityid"]) // TODO can we get it from cognito rather thas from FE?

        if (request.langOptions) validateUniqueEntries(request.langOptions, "lang", "Language options not unique.")
        if (request.images) validateUniqueEntries(request.images, "id", "Image refs not unique.")

        const response = await exhibitionService.createExhibition(customerId, identityId, request)
        return responseFormatter(200, response)
    } catch (err) {
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

        return responseFormatter(200, exhibition)
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

        const exhibitions = await exhibitionService.getExhibitionsForCustomer(customerId, pagination, filters)
        return responseFormatter(200, exhibitions)
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

        if (request.langOptions) validateUniqueEntries(request.langOptions, "lang", "Language options not unique.")
        if (request.images) validateUniqueEntries(request.images, "name", "Image refs not unique.")

        const response = await exhibitionService.updateExhibition(exhibitionId, customerId, request)
        return responseFormatter(200, response)
    } catch (err) {
        return restHandleError(err);
    }
}

export const exhibitionUpdateHandler = middy(exhibitionUpdate);
exhibitionUpdateHandler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))