import {handleError} from "./common/response-formatter";
import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {required} from "./schema/validation";
import QRCode from 'qrcode'
import {logger} from "./common/logger";
import {QrCodeAsset} from "./model/asset";
import {PutObjectCommand} from "@aws-sdk/client-s3";
import {s3Client} from "./common/aws-clients";

const domain = required.parse(process.env.APP_DOMAIN)
const crmAssetBucket = required.parse(process.env.CRM_ASSET_BUCKET)

const qrCodeGenerator = async (qrCode: QrCodeAsset) => {
    try {
        const urlToEncode = `${domain}/${qrCode.value}`
        const qrCodeBuffer = await QRCode.toBuffer(urlToEncode, {
            scale: 16
        })

        const params = new PutObjectCommand({
            Bucket: crmAssetBucket,
            Key: qrCode.privatePath,
            Body: qrCodeBuffer,
            ContentType: 'image/png'
        });
        await s3Client.send(params);

        logger.debug(`QR code for with encoded value: ${urlToEncode} has been generated and uploaded to S3 at ${qrCode.privatePath}`);
    } catch (err) {
        return handleError(err);
    }
};

export const handler = middy(qrCodeGenerator);
handler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))