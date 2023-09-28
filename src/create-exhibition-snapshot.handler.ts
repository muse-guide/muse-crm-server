import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from 'aws-lambda';
import {handleError, responseFormatter} from "./common/response-formatter";
import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import cors from "@middy/http-cors";
import {injectLambdaContext} from "@aws-lambda-powertools/logger";
import {logger} from "./common/logger";
import {z} from "zod";
import {ExhibitionSnapshot} from "./model/exhibition-snapshot.model";
import {Exhibition} from "./model/exhibition.model";
import {exhibitionSnapshotService} from "./services/entity.service";

const exhibitionSchema = z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    institutionId: z.string().uuid(),
    qrCodeUrl: z.string().min(1).max(64),
    referenceName: z.string().min(1).max(64),
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

const createExhibitionSnapshotHandler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    try {
        logger.info(`Received request, path: ${event.path}, method: ${event.httpMethod}`)
        const exhibition = exhibitionSchema.parse(event.body) as Exhibition

        const institutionId = exhibition.includeInstitutionInfo ? exhibition.institutionId : undefined
        const langOptions = exhibition.langOptions.map(option => option.lang)
        const imageUrls = exhibition.images.map(image => image.url)
        const exhibitionSnapshots: Array<ExhibitionSnapshot> = exhibition.langOptions
            .map(langOption => {
                return {
                    id: exhibition.id,
                    institutionId: institutionId,
                    lang: langOption.lang,
                    langOptions: langOptions,
                    title: langOption.title,
                    subtitle: langOption.subtitle,
                    description: langOption.description,
                    imageUrls: imageUrls,
                    exhibits: []
                }
            })

        const result = exhibitionSnapshots.map(async exhibitionSnapshot => {
            return await exhibitionSnapshotService.createEntity(exhibitionSnapshot)
        })
        return responseFormatter(200, await Promise.all(result))
    } catch (err) {
        return handleError(err);
    }
};

export const handler = middy(createExhibitionSnapshotHandler);
handler
    .use(cors())
    .use(injectLambdaContext(logger, {logEvent: true}))
    .use(httpJsonBodyParser())