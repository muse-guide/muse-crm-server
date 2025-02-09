import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {uuidId, validateAudioCharacterCount} from "./schema/validation";
import {responseFormatter, restHandleError} from "./common/response-formatter";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {audioPreviewRequest, AudioPreviewResponseDto} from "./schema/audio-preview";
import {audioService} from "./service/audio";
import {nanoid_8} from "./model/common";
import {PutObjectCommand} from "@aws-sdk/client-s3";
import {s3Client} from "./common/aws-clients";
import {AudioInput} from "./model/asset";

const privateAssetBucket = process.env.CRM_ASSET_BUCKET

const generateAudioPreview = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)
        const request: AudioInput = audioPreviewRequest.parse(event.body)
        validateAudioCharacterCount(request.markup)

        const mp3 = await audioService.generate(request)
        const key = nanoid_8()

        const params = new PutObjectCommand({
            Bucket: privateAssetBucket,
            Key: `${customerId}/tmp/${key}`,
            Body: mp3,
            ContentType: 'audio/mpeg'
        });
        await s3Client.send(params);

        const response: AudioPreviewResponseDto = {
            audio: {
                key: key
            }
        }
        return responseFormatter(200, response)
    } catch (err) {
        return restHandleError(err);
    }
};

export const generateAudioPreviewHandler = middy(generateAudioPreview);
generateAudioPreviewHandler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))