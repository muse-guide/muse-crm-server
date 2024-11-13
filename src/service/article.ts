import {parse} from "node-html-parser";
import {GetObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {s3Client} from "../common/aws-clients";
import {Exposable, ResourceType} from "./common";

const privateAssetBucket = process.env.CRM_ASSET_BUCKET
const appDomain = process.env.APP_DOMAIN

const processArticleImages = (markup?: string) => {
    if (!markup) return undefined;

    const root = parse(markup);
    const images = root.querySelectorAll('img');

    images
        .map((image) => {
            const src = image.getAttribute('src')
            if (!src) return undefined;

            const idRegex = /images\/(.*?)\?/g.exec(src);
            const imageId = idRegex ? idRegex[1] : undefined;

            image.setAttribute('src', imageId ?? "");
        })

    return root.toString();
}

const getArticleImages = (markup?: string): string[] => {
    if (!markup) return [];

    const root = parse(markup);
    const images = root.querySelectorAll('img');

    return images
        .map((image) => image.getAttribute('src'))
        .filter((id) => id !== undefined);
}

const preparePresignedArticleImages = async (exposable: Exposable): Promise<Exposable> => {
    return {
        ...exposable,
        langOptions: await Promise.all(exposable.langOptions.map(async (lang) => ({
            ...lang,
            article: await replaceImageIdsWithPresignedUrls(exposable.identityId, lang.article),
        }))),
    };
}

const replaceImageIdsWithPresignedUrls = async (identityId: string, markup?: string) => {
    if (!markup) return undefined;

    const root = parse(markup);
    const images = root.querySelectorAll('img');

    const promises = images.map(async (image) => {
        const src = image.getAttribute('src');
        if (!src) return;

        const presignedUrl = await createPresignedUrl(identityId, src);
        image.setAttribute('src', presignedUrl);
    });

    await Promise.all(promises);

    return root.toString();
}

const createPresignedUrl = async (identityId: string, imageId: string) => {
    const key = `private/${identityId}/images/${imageId}`;
    const command = new GetObjectCommand({Bucket: privateAssetBucket, Key: key});
    return await getSignedUrl(s3Client, command, {expiresIn: 7200});
};

const preparePublicArticleImages = (resourceId: string, resourceType: ResourceType, markup?: string): string | undefined => {
    if (!markup) return undefined;

    const root = parse(markup);
    const images = root.querySelectorAll('img');

    images.map((image) => {
        const src = image.getAttribute('src');
        if (!src) return;

        const publicUrl = `${appDomain}/asset/${resourceType}/${resourceId}/images/${src}`;
        image.setAttribute('src', publicUrl);
    });

    return root.toString();
}

export const articleService = {
    processArticleImages: processArticleImages,
    getArticleImages: getArticleImages,
    prepareArticleImages: preparePresignedArticleImages,
    preparePublicArticleImages: preparePublicArticleImages,
}