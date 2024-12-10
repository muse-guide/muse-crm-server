import {parse} from "node-html-parser";
import {Exposable} from "./common";
import {assetService} from "./asset";

const appDomain = process.env.APP_DOMAIN

const processArticleImages = (markup?: string) => {
    if (!markup) return undefined;

    const root = parse(markup);
    const images = root.querySelectorAll('img');

    images
        .map((image) => {
            const src = image.getAttribute('src')
            if (!src) return undefined;

            const idRegex = /tmp\/(.*?)\?/g.exec(src);
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

const preparePreSignedArticleImages = async (exposable: Exposable): Promise<Exposable> => {
    return {
        ...exposable,
        langOptions: await Promise.all(exposable.langOptions.map(async (lang) => ({
            ...lang,
            article: await replaceImageIdsWithPreSignedUrls(exposable.customerId, lang.article),
        }))),
    };
}

const replaceImageIdsWithPreSignedUrls = async (customerId: string, markup?: string) => {
    if (!markup) return undefined;

    const root = parse(markup);
    const images = root.querySelectorAll('img');

    const promises = images.map(async (image) => {
        const src = image.getAttribute('src');
        if (!src) return;

        const presignedUrl = await assetService.createGetPreSignedUrlFor({
            customerId: customerId,
            assetType: "images",
            assetId: src,
        });
        image.setAttribute('src', presignedUrl);
    });

    await Promise.all(promises);

    return root.toString();
}

const preparePublicArticleImages = (resourceId: string, markup?: string): string | undefined => {
    if (!markup) return undefined;

    const root = parse(markup);
    const images = root.querySelectorAll('img');

    images.map((image) => {
        const src = image.getAttribute('src');
        if (!src) return;

        const publicUrl = `${appDomain}/asset/${resourceId}/images/${src}`;
        image.setAttribute('src', publicUrl);
    });

    return root.toString();
}

export const articleService = {
    processArticleImages: processArticleImages,
    getArticleImages: getArticleImages,
    prepareArticleImages: preparePreSignedArticleImages,
    preparePublicArticleImages: preparePublicArticleImages,
}