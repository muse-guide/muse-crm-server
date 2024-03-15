import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {nanoId, required, uuidId, validateUniqueEntries} from "./schema/validation";
import {exhibitService} from "./service/exhibit";
import {CreateExhibitDto, createExhibitSchema, updateExhibitSchema} from "./schema/exhibit";
import {responseFormatter, restHandleError} from "./common/response-formatter";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import cors from "@middy/http-cors";
import {z} from "zod";

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
        const identityId = required.parse(event.headers?.["identityid"]) // TODO can we get it from cognito rather thas from FE?

        if (request.langOptions) validateUniqueEntries(request.langOptions, "lang", "Language options not unique.")
        if (request.images) validateUniqueEntries(request.images, "id", "Image refs not unique.")

        const response = await exhibitService.createExhibit(customerId, identityId, request)
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

        return responseFormatter(200, exhibit)
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
        const exhibitionId = event.queryStringParameters?.["exhibition-id"]

        const pageSize = z.coerce.number().optional().parse(event.queryStringParameters?.["page-size"])
        const nextPageKey = event.queryStringParameters?.["next-page-key"]
        const pagination = {
            pageSize: pageSize ?? 10,
            nextPageKey: nextPageKey
        }

        const exhibits = await exhibitService.getExhibitsForCustomer(customerId, pagination, exhibitionId)
        return responseFormatter(200, exhibits)
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

        if (request.langOptions) validateUniqueEntries(request.langOptions, "lang", "Language options not unique.")
        if (request.images) validateUniqueEntries(request.images, "id", "Image refs not unique.")

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