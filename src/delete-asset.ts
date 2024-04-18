import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {required} from "./schema/validation";
import {DeleteAsset} from "./model/asset";
import {handleError} from "./common/response-formatter";
import {DeleteObjectsCommand} from "@aws-sdk/client-s3";
import {s3Client} from "./common/aws-clients";

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
        if (privateAsset) {
            const objects = privateAsset.map(path => {
                return {Key: path}
            })
            const command = new DeleteObjectsCommand({
                Bucket: privateAssetBucket,
                Delete: {
                    Objects: objects,
                    Quiet: true,
                }
            });

            await s3Client.send(command);
        }

        if (publicAsset) {
            const objects = publicAsset.map(path => {
                return {Key: path}
            })
            const command = new DeleteObjectsCommand({
                Bucket: publicAssetBucket,
                Delete: {
                    Objects: objects,
                    Quiet: true,
                }
            });

            await s3Client.send(command);
        }
    } catch (err) {
        return handleError(err);
    }
};

export const handler = middy(deleteAssetHandler);
handler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))