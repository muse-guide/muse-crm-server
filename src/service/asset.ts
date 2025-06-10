import {GetObjectCommand, PutObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {s3Client} from "../common/aws-clients";
import {AssetType} from "../model/asset";

const privateAssetBucket = process.env.CRM_ASSET_BUCKET

type GetPreSignedUrlInput = {
    customerId: string,
    assetType: AssetType,
    assetId: string,
}

const generateGetPreSignedUrlFor = async (input: GetPreSignedUrlInput) => {
    const key = `${input.customerId}/${input.assetType}/${input.assetId}`;
    const command = new GetObjectCommand({
        Bucket: privateAssetBucket,
        Key: key,
        ResponseExpires: new Date(Date.now() + 7200 * 1000), // 2 hours
        ResponseCacheControl: 'max-age=7200',
        ResponseContentDisposition: `inline; filename="${input.assetId}"`,
    });

    return await getSignedUrl(s3Client, command, {expiresIn: 7200});
};

type PutPreSignedUrlInput = {
    customerId: string,
    assetId: string,
    contentType: string,
}

const generatePutPreSignedUrlFor = async (input: PutPreSignedUrlInput) => {
    const key = `${input.customerId}/tmp/${input.assetId}`;
    const command = new PutObjectCommand({
        Bucket: privateAssetBucket,
        Key: key,
        ContentType: input.contentType,
        Tagging: `temp=true`
    });
    return await getSignedUrl(s3Client, command, {expiresIn: 7200});
}

export const assetService = {
    createGetPreSignedUrlFor: generateGetPreSignedUrlFor,
    createPutPreSignedUrlFor: generatePutPreSignedUrlFor,
}