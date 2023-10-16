import {exhibitionService} from "./clients/entity.service";
import {handleError} from "./common/response-formatter";
import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {id} from "./common/validation";
import {Exhibition} from "./model/exhibition.model";
import {z} from "zod";
import {StateMachineInput} from "./model/common.model";

const updateExhibitionSchema = z.object({
    referenceName: z.string().min(1).max(64).optional(),
    includeInstitutionInfo: z.boolean().optional(),
    langOptions: z.array(z.object({
        lang: z.string().length(2),
        title: z.string().min(1).max(64),
        subtitle: z.string().min(1).max(64),
        description: z.string().min(1).max(256).optional(),
    })).optional(),
    images: z.array(z.object({
        name: z.string().min(1).max(64),
        url: z.string().url()
    })).optional()
})

const updateExhibitionHandler = async (event: StateMachineInput): Promise<Exhibition> => {
    try {
        const request = updateExhibitionSchema.parse(event.body)
        const exhibitionId = id.parse(event.path?.["id"])
        const customerId = id.parse(event.sub)

        const exhibition = await exhibitionService.getEntity(exhibitionId, customerId)
        updateKey(exhibition, request, ["referenceName", "includeInstitutionInfo"])

        return await exhibitionService.updateEntity(exhibition)
    } catch (err) {
        return handleError(err);
    }
};

const updateKey = (entity: any, request: any, keys: string[]) => {
    for (const key of keys) {
        if (request[key] != null && entity[key] != null && entity[key] !== request[key]) entity[key] = request[key]
    }
}

export const handler = middy(updateExhibitionHandler);
handler
    .use(httpJsonBodyParser())