import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {required} from "./schema/validation";
import * as AWS from 'aws-sdk';
import {CopyObjectRequest} from 'aws-sdk/clients/s3';
import {logger} from "./common/logger";
import {ImageAsset} from "./model/common";
import {handleError} from "./common/response-formatter";

const s3 = new AWS.S3();
const privateAssetBucket = required.parse(process.env.CRM_ASSET_BUCKET)
const publicAssetBucket = required.parse(process.env.APP_ASSET_BUCKET)

const imageProcessor = async (images: ImageAsset[]) => {
    try {
        await Promise.all(
            images!!
                .map(async (asset) => {
                        const params: CopyObjectRequest = {
                            Bucket: publicAssetBucket,
                            CopySource: `/${privateAssetBucket}/${asset.privatePath}`,
                            Key: asset.publicPath,
                            ContentEncoding: 'base64',
                        };

                        await s3.copyObject(params).promise();
                        logger.debug(`Asset ${asset.privatePath} copied to public bucket with key ${asset.publicPath}`);
                    }
                )
        )
    } catch (err) {
        return handleError(err);
    }
};

export const handler = middy(imageProcessor);
handler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))