import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {required, uuidId} from "./schema/validation";
import {StateMachineInput} from "./model/common";
import {ExposableMutation} from "./model/mutation";
import {exhibitService} from "./service/exhibit";
import {CreateExhibitDto, CreateExhibitResponseDto, createExhibitSchema} from "./schema/exhibit";
import {handleError, responseFormatter, restHandleError} from "./common/response-formatter";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";

/**
 * Creates a new exhibit
 *
 * @param event - The API Gateway proxy event containing exhibit data
 * @returns ExposableMutation with created exhibit
 */
const exhibitCreate = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const request: CreateExhibitDto = createExhibitSchema.parse(event.body)
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)
        const identityId = required.parse(event.headers?.["identityid"]) // TODO can we get it from cognito rather thas from FE?

        const response = await exhibitService.createExhibit(request, customerId, identityId)
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