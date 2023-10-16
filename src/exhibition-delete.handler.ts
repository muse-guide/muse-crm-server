import {exhibitionService} from "./clients/entity.service";
import {handleError} from "./common/response-formatter";
import middy from "@middy/core";
import {id} from "./common/validation";
import {StateMachineInput} from "./model/common.model";
import {ExhibitionSnapshotId} from "./model/exhibition-snapshot.model";
import httpJsonBodyParser from "@middy/http-json-body-parser";

const exhibitionDeleteHandler = async (event: StateMachineInput): Promise<ExhibitionSnapshotId[]> => {
    try {
        const exhibitionId = id.parse(event.path?.["id"])
        const customerId = id.parse(event.sub)

        const exhibition = await exhibitionService.getEntity(exhibitionId, customerId)
        await exhibitionService.deleteEntity(exhibitionId, customerId)
        return exhibition.langOptions.map(option => {
            return {
                id: exhibitionId,
                lang: option.lang
            }
        })
    } catch (err) {
        return handleError(err);
    }
};

export const handler = middy(exhibitionDeleteHandler);
handler
    .use(httpJsonBodyParser())
