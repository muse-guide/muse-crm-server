import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {nanoId, required, uuidId, validateUniqueEntries} from "./schema/validation";
import {MutationContext, StateMachineInput} from "./model/common.model";
import {updateExhibitionSchema} from "./schema/exhibition-update.schema";
import {handleError} from "./common/response-formatter";
import {exhibitService} from "./service/exhibition.service";


export const updateExhibitionHandler = async (event: StateMachineInput): Promise<MutationContext> => {
    try {
        const request = updateExhibitionSchema.parse(event.body)
        const exhibitionId = nanoId.parse(event.path?.["id"])
        const customerId = uuidId.parse(event.sub)
        const identityId = required.parse(event.header?.["identityid"]) // TODO can we get it from cognito rather thas from FE?

        if (request.langOptions) validateUniqueEntries(request.langOptions, "lang", "Language options not unique.")
        if (request.images) validateUniqueEntries(request.images, "name", "Image refs not unique.")

        return await exhibitService.updateExhibition(exhibitionId, request, customerId, identityId)
    } catch (err) {
        return handleError(err);
    }

}

export const handler = middy(updateExhibitionHandler);
handler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))