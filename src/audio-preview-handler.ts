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
import {customerService} from "./service/customer";

const privateAssetBucket = process.env.CRM_ASSET_BUCKET

const generateAudioPreview = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)
        const request: AudioInput = audioPreviewRequest.parse(event.body)
        const billableTokens = validateAudioCharacterCount(request.markup)

        const {subscription} = await customerService.authorizeAudioPreviewCreationAndLock(customerId, billableTokens)
        const mp3 = await audioService.generate(request)
        const key = nanoid_8()

        const params = new PutObjectCommand({
            Bucket: privateAssetBucket,
            Key: `${customerId}/tmp/${key}`,
            Body: mp3,
            ContentLength: mp3.length,
            ContentType: 'audio/mpeg'
        });
        await s3Client.send(params);

        await customerService.unlockSubscription(subscription.subscriptionId)

        const response: AudioPreviewResponseDto = {
            audio: {
                key: key,
                billableTokens: billableTokens,
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