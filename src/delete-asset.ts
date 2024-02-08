import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {required} from "./schema/validation";
import * as AWS from 'aws-sdk';
import {DeleteObjectRequest} from 'aws-sdk/clients/s3';
import {DeleteAsset} from "./model/common";
import {handleError} from "./common/response-formatter";

const s3 = new AWS.S3();
const privateAssetBucket = required.parse(process.env.CRM_ASSET_BUCKET)
const publicAssetBucket = required.parse(process.env.APP_ASSET_BUCKET)

/**
 * Deletes assets from S3 buckets
 *
 * @param input - Contains asset data to delete
 * @returns The input event object
 */
const deleteAssetHandler = async (input: DeleteAsset[]) => {
    try {
        await Promise.all(
            input
                .map(asset => [
                        {
                            Bucket: privateAssetBucket,
                            Key: asset.privatePath,
                        },
                        asset.publicPath ? {
                            Bucket: publicAssetBucket,
                            Key: asset.publicPath
                        } : undefined
                    ]
                )
                .flat()
                .filter((item): item is DeleteObjectRequest => !!item)
                .map(async (item) => await s3.deleteObject(item).promise())
        )
    } catch (err) {
        return handleError(err);
    }
};

export const handler = middy(deleteAssetHandler);
handler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))