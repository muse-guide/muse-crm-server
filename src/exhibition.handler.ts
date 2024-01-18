import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {required, uuidId} from "./schema/validation";
import {MutationContext, StateMachineInput} from "./model/common.model";
import {exhibitService} from "./service/exhibition.service";
import {CreateExhibition, createExhibitionSchema} from "./schema/exhiibition-create.schema";
import {handleError} from "./common/response-formatter";

const exhibitionCreateHandler = async (event: StateMachineInput): Promise<MutationContext> => {
    try {
        const request: CreateExhibition = createExhibitionSchema.parse(event.body)
        const customerId = uuidId.parse(event.sub)
        const identityId = required.parse(event.header?.["identityid"]) // TODO can we get it from cognito rather thas from FE?

        return await exhibitService.createExhibition(request, customerId, identityId)
    } catch (err) {
        return handleError(err);
    }
};

export const handler = middy(exhibitionCreateHandler);
handler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))

const exhibitionDeleteHandler = async (event: StateMachineInput): Promise<MutationContext> => {
    try {
        const exhibitionId = nanoId.parse(event.path?.["id"])
        const customerId = uuidId.parse(event.sub)
        const identityId = required.parse(event.header?.["identityid"]) // TODO can we get it from cognito rather thas from FE?

        return await exhibitService.deleteExhibition(exhibitionId, customerId, identityId)
    } catch (err) {
        return handleError(err);
    }
};

export const handler = middy(exhibitionDeleteHandler);
handler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))