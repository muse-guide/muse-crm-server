import {handleError} from "./common/response-formatter";
import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {required} from "./schema/validation";
import QRCode from 'qrcode'
import * as AWS from 'aws-sdk';
import {PutObjectRequest} from 'aws-sdk/clients/s3';
import {logger} from "./common/logger";
import {QrCodeAsset} from "./model/common";

const s3 = new AWS.S3();

const qrCodeGenerator = async (qrCode: QrCodeAsset) => {
    try {
        const domain = required.parse(process.env.APP_DOMAIN)
        const bucketName = required.parse(process.env.CRM_ASSET_BUCKET)

        const urlToEncode = `${domain}/${qrCode!!.value}`
        const qrCodeKey = qrCode!!.path
        const qrCodeBuffer = await QRCode.toBuffer(urlToEncode)

        const params: PutObjectRequest = {
            Bucket: bucketName,
            Key: qrCodeKey,
            Body: qrCodeBuffer,
            ContentEncoding: 'base64',
            ContentType: 'image/png'
        };

        await s3.upload(params).promise();

        logger.debug(`QR code for with encoded value: ${urlToEncode} has been generated and uploaded to S3 at ${qrCodeKey}`);
    } catch (err) {
        return handleError(err);
    }
};

export const handler = middy(qrCodeGenerator);
handler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))