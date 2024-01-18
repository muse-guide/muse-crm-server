import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {required, uuidId} from "./schema/validation";
import {MutationContext, StateMachineInput} from "./model/common.model";
import {exhibitService} from "./service/exhibition.service";
import {CreateExhibition, createExhibitionSchema} from "./schema/exhiibition-create.schema";
import {handleError} from "./common/response-formatter";

const exhibitionCreate = async (event: StateMachineInput): Promise<MutationContext> => {
    try {
        const request: CreateExhibition = createExhibitionSchema.parse(event.body)
        const customerId = uuidId.parse(event.sub)
        const identityId = required.parse(event.header?.["identityid"]) // TODO can we get it from cognito rather thas from FE?

        return await exhibitService.createExhibition(request, customerId, identityId)
    } catch (err) {
        return handleError(err);
    }
};

export const exhibitionCreateHandler = middy(exhibitionCreate);
exhibitionCreateHandler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))