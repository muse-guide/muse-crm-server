import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {nanoId, required, uuidId, validateUniqueEntries} from "./schema/validation";
import {StateMachineInput} from "./model/common";
import {ExposableMutation} from "./model/mutation";
import {exhibitionService} from "./service/exhibition";
import {CreateExhibitionDto, createExhibitionSchema, updateExhibitionSchema} from "./schema/exhibition";
import {handleError, responseFormatter, restHandleError} from "./common/response-formatter";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import cors from "@middy/http-cors";
import {z} from "zod";

/**
 * Creates a new exhibition
 *
 * @param event - The API Gateway proxy event containing exhibition data
 * @returns ExposableMutation with created exhibition
 */
const exhibitionCreate = async (event: StateMachineInput): Promise<ExposableMutation> => {
    try {
        const request: CreateExhibitionDto = createExhibitionSchema.parse(event.body)
        const customerId = uuidId.parse(event.sub)
        const identityId = required.parse(event.header?.["identityid"]) // TODO can we get it from cognito rather thas from FE?

        return await exhibitionService.createExhibition(request, customerId, identityId)
    } catch (err) {
        return handleError(err);
    }
};

export const exhibitionCreateHandler = middy(exhibitionCreate);
exhibitionCreateHandler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))


/**
 * Deletes an exhibition
 *
 * @param event - The API Gateway proxy event containing exhibition ID
 * @returns ExposableMutation with deleted exhibition
 */
const exhibitionDelete = async (event: StateMachineInput): Promise<ExposableMutation> => {
    try {
        const exhibitionId = nanoId.parse(event.path?.["id"])
        const customerId = uuidId.parse(event.sub)
        const identityId = required.parse(event.header?.["identityid"]) // TODO can we get it from cognito rather thas from FE?

        return await exhibitionService.deleteExhibition(exhibitionId, customerId, identityId)
    } catch (err) {
        return handleError(err);
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
export const exhibitionUpdate = async (event: StateMachineInput): Promise<ExposableMutation> => {
    try {
        const request = updateExhibitionSchema.parse(event.body)
        const exhibitionId = nanoId.parse(event.path?.["id"])
        const customerId = uuidId.parse(event.sub)
        const identityId = required.parse(event.header?.["identityid"]) // TODO can we get it from cognito rather thas from FE?

        if (request.langOptions) validateUniqueEntries(request.langOptions, "lang", "Language options not unique.")
        if (request.images) validateUniqueEntries(request.images, "name", "Image refs not unique.")

        return await exhibitionService.updateExhibition(exhibitionId, request, customerId, identityId)
    } catch (err) {
        return handleError(err);
    }
}

export const exhibitionUpdateHandler = middy(exhibitionUpdate);
exhibitionUpdateHandler
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
        const pageSize = z.coerce.number().optional().parse(event.queryStringParameters?.["page-size"])
        const nextPageKey = event.queryStringParameters?.["next-page-key"]
        const exhibitions = await exhibitionService.getExhibitionsForCustomer(customerId, {
            pageSize: pageSize ?? 10,
            nextPageKey: nextPageKey
        })

        return responseFormatter(200, exhibitions)
    } catch (err) {
        return restHandleError(err);
    }
};

export const exhibitionGetAllHandler = middy(exhibitionGetAll);
exhibitionGetAllHandler
    .use(cors())
