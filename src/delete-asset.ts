import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {required} from "./schema/validation";
import * as AWS from 'aws-sdk';
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
const deleteAssetHandler = async (input: DeleteAsset) => {
    const privateAsset = input.private
    const publicAsset = input.public

    try {
        await Promise.all(
            privateAsset
                .map(path => {
                        return {
                            Bucket: privateAssetBucket,
                            Key: path,
                        }
                    }
                )
                .map(async (item) => await s3.deleteObject(item).promise())
        )

        await Promise.all(
            publicAsset
                .map(path => {
                        return {
                            Bucket: privateAssetBucket,
                            Key: path,
                        }
                    }
                )
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