import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {required} from "./schema/validation";
import {logger} from "./common/logger";
import {ImageAsset} from "./model/asset";
import {handleError} from "./common/response-formatter";
import {CopyObjectCommand, GetObjectCommand, PutObjectCommand} from "@aws-sdk/client-s3";
import {s3Client} from "./common/aws-clients";
import Jimp from "jimp";

const privateAssetBucket = required.parse(process.env.CRM_ASSET_BUCKET)
const publicAssetBucket = required.parse(process.env.APP_ASSET_BUCKET)

const imageProcessor = async (images: ImageAsset[]) => {
    try {
        await Promise.all(
            images!!
                .map(async (asset) => {
                        const tmpImageRequest = new GetObjectCommand({
                            Bucket: privateAssetBucket,
                            Key: asset.tmpPath,
                        })

                        const tmpImageResponse = await s3Client.send(tmpImageRequest)
                        const tmpImage = await tmpImageResponse.Body?.transformToByteArray()!!

                        const thumbnailImage = await Jimp.read(Buffer.from(tmpImage),)
                            .then(image => {
                                return image
                                    .cover(100, 100, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE)
                                    .quality(80)
                                    .getBufferAsync(Jimp.MIME_JPEG)
                            })

                        const mobileOptimizedImage = await Jimp.read(Buffer.from(tmpImage),)
                            .then(image => {
                                return image
                                    .contain(400, Jimp.AUTO, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE)
                                    .quality(80)
                                    .getBufferAsync(Jimp.MIME_JPEG)
                            })

                        const privateBucketCopyParams = new CopyObjectCommand({
                            CopySource: `/${privateAssetBucket}/${asset.tmpPath}`,
                            Bucket: privateAssetBucket,
                            Key: asset.privatePath,
                        });

                        const privateThumbnailImagePutParams = new PutObjectCommand({
                            Bucket: privateAssetBucket,
                            Key: asset.thumbnails.privatePath,
                            Body: thumbnailImage,
                        });

                        const publicMobileOptimizedImagePutParams = new PutObjectCommand({
                            Bucket: publicAssetBucket,
                            Key: asset.publicPath,
                            Body: mobileOptimizedImage,
                        });

                        const publicThumbnailImagePutParams = new PutObjectCommand({
                            Bucket: publicAssetBucket,
                            Key: asset.thumbnails.publicPath,
                            Body: thumbnailImage,
                        });

                        await Promise.all([
                            s3Client.send(privateBucketCopyParams),
                            s3Client.send(privateThumbnailImagePutParams),
                            s3Client.send(publicMobileOptimizedImagePutParams),
                            s3Client.send(publicThumbnailImagePutParams),
                        ])
                        logger.debug(`Asset ${asset.tmpPath} copied to ${asset.publicPath} and ${asset.privatePath}`);
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