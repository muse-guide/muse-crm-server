import {handleError} from "./common/response-formatter";
import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {required} from "./schema/validation";
import * as AWS from 'aws-sdk';
import {CopyObjectRequest, DeleteObjectRequest} from 'aws-sdk/clients/s3';
import {logger} from "./common/logger";
import {AssetProcessorInput} from "./model/asset";
import {MutationContext} from "./model/common";

const s3 = new AWS.S3();
const privateAssetBucket = required.parse(process.env.CRM_ASSET_BUCKET)
const publicAssetBucket = required.parse(process.env.APP_ASSET_BUCKET)

const assetProcessor = async (event: MutationContext): Promise<MutationContext> => {
    try {
        const {assetToProcess} = event
        const requests = assetToProcess ? assetToProcess.map(asset => {
                switch (asset.action) {
                    case "CREATE":
                        return expose(asset)
                    case "DELETE":
                        return remove(asset)
                    default:
                        logger.debug(`Unrecognized asset action: ${asset.action}`);
                        return Promise.resolve()
                }
            }
        ) : []

        await Promise.all(requests)

        return event
    } catch (err) {
        return handleError(err);
    }
};

export const handler = middy(assetProcessor);
handler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))

const expose = async (asset: AssetProcessorInput) => {
    if (asset.target) {
        const params: CopyObjectRequest = {
            Bucket: publicAssetBucket,
            CopySource: `/${privateAssetBucket}/${asset.source}`,
            Key: asset.target,
            ContentEncoding: 'base64',
        };

        await s3.copyObject(params).promise();
        logger.debug(`Asset ${asset.source} copied to public bucket with key ${asset.target}`);
    }
}

const remove = async (asset: AssetProcessorInput) => {
    const privateAssetParams: DeleteObjectRequest = {
        Bucket: privateAssetBucket,
        Key: asset.source,
    };

    let publicAssetParams = undefined
    if (asset.target) {
        publicAssetParams = {
            Bucket: publicAssetBucket,
            Key: asset.target,
        };
    }

    await Promise.all([
        s3.deleteObject(privateAssetParams).promise(),
        publicAssetParams ? s3.deleteObject(publicAssetParams).promise() : undefined
    ])
    logger.debug(`Asset ${asset.source} copied to public bucket with key ${asset.target}`);
}