import {handleError} from "./common/response-formatter";
import middy from "@middy/core";
import {nanoId, required, uuidId} from "./schema/validation";
import {MutationContext, StateMachineInput} from "./model/common.model";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import {exhibitService} from "./service/exhibition.service";

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
