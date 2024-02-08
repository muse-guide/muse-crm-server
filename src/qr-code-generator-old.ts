import {handleError} from "./common/response-formatter";
import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {required} from "./schema/validation";
import QRCode from 'qrcode'
import * as AWS from 'aws-sdk';
import {PutObjectRequest} from 'aws-sdk/clients/s3';
import {logger} from "./common/logger";
import {MutationContext} from "./model/common";

const s3 = new AWS.S3();

const qrCodeGeneratorOld = async (event: MutationContext): Promise<MutationContext> => {
    try {
        const {entity, actor} = event.mutation

        const domain = required.parse(process.env.APP_DOMAIN)
        const bucketName = required.parse(process.env.CRM_ASSET_BUCKET)
        const urlToEncode = `${domain}/col/${entity.id}`
        const qrCodeKey = `private/${actor.identityId}/${entity.qrCodeUrl}`
        const qrCode = await QRCode.toBuffer(urlToEncode)

        const params: PutObjectRequest = {
            Bucket: bucketName,
            Key: qrCodeKey,
            Body: qrCode,
            ContentEncoding: 'base64',
            ContentType: 'image/png'
        };

        await s3.upload(params).promise();
        logger.debug(`QR code for exhibition ${entity.id} has been generated and uploaded to S3 at ${qrCodeKey}`);

        return event
    } catch (err) {
        return handleError(err);
    }
};

export const handler = middy(qrCodeGeneratorOld);
handler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))