import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {required} from "./schema/validation";
import {handleError} from "./common/response-formatter";
import {audioService} from "./service/audio";
import {AudioAsset} from "./model/asset";
import {PutObjectCommand} from "@aws-sdk/client-s3";
import {s3Client} from "./common/aws-clients";

const privateAssetBucket = required.parse(process.env.CRM_ASSET_BUCKET)
const publicAssetBucket = required.parse(process.env.APP_ASSET_BUCKET)

const audioProcessor = async (audios: AudioAsset[]) => {
    try {
        await Promise.all(audios.map(processSingle))
    } catch (err) {
        return handleError(err);
    }
};

const processSingle = async (audio: AudioAsset) => {
    const mp3 = await audioService.generate(audio)

    const privateAsset = new PutObjectCommand({
        Bucket: privateAssetBucket,
        Key: audio.privatePath,
        Body: mp3,
        ContentType: 'audio/mpeg'
    });
    const publicAsset = new PutObjectCommand({
        Bucket: publicAssetBucket,
        Key: audio.publicPath,
        Body: mp3,
        ContentType: 'audio/mpeg'
    });

    await Promise.all([
        s3Client.send(privateAsset),
        s3Client.send(publicAsset),
    ])
}

export const handler = middy(audioProcessor);
handler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))