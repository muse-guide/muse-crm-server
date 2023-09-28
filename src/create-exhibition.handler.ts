import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from 'aws-lambda';
import {exhibitionService} from "./services/entity.service";
import {handleError, responseFormatter} from "./common/response-formatter";
import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import cors from "@middy/http-cors";
import {injectLambdaContext} from "@aws-lambda-powertools/logger";
import {logger} from "./common/logger";
import {id} from "./common/validation";
import {Exhibition} from "./model/exhibition.model";
import {v4 as uuidv4} from 'uuid';
import {z} from "zod";

const createExhibitionSchema = z.object({
    referenceName: z.string().min(1).max(64),
    institutionId: z.string().uuid(),
    includeInstitutionInfo: z.boolean(),
    langOptions: z.array(z.object({
        lang: z.string().length(2),
        title: z.string().min(1).max(64),
        subtitle: z.string().min(1).max(64),
        description: z.string().min(1).max(256).optional(),
    })).nonempty(),
    images: z.array(z.object({
        name: z.string().min(1).max(64),
        url: z.string().url()
    }))
})

const createExhibitionHandler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    try {
        logger.info(`Received request, path: ${event.path}, method: ${event.httpMethod}`)
        const request = createExhibitionSchema.parse(event.body)
        const customerId = id.parse(event.requestContext.authorizer?.claims.sub)

        const exhibition: Exhibition = {
            id: uuidv4(),
            customerId: customerId,
            qrCodeUrl: "/asset/qr.png",
            ...request
        }

        const result = await exhibitionService.createEntity(exhibition)
        return responseFormatter(200, result)
    } catch (err) {
        return handleError(err);
    }
};

export const handler = middy(createExhibitionHandler);
handler
    .use(cors())
    .use(injectLambdaContext(logger, {logEvent: true}))
    .use(httpJsonBodyParser())