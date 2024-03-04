import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {required} from "./schema/validation";
import * as AWS from 'aws-sdk';
import {PutObjectRequest} from 'aws-sdk/clients/s3';
import {handleError} from "./common/response-formatter";
import {audioService} from "./service/audio";
import {AudioAsset} from "./model/asset";

const s3 = new AWS.S3();
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

    const privateAsset: PutObjectRequest = {
        Bucket: privateAssetBucket,
        Key: audio.privatePath,
        Body: mp3,
        ContentEncoding: 'base64',
        ContentType: 'audio/mpeg'
    };
    const publicAsset: PutObjectRequest = {
        Bucket: publicAssetBucket,
        Key: audio.publicPath,
        Body: mp3,
        ContentEncoding: 'base64',
        ContentType: 'audio/mpeg'
    };

    await Promise.all([
        s3.upload(privateAsset).promise(),
        s3.upload(publicAsset).promise(),
    ])
}

export const handler = middy(audioProcessor);
handler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))