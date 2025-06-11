import {z} from "zod";
import {BadRequestException} from "../common/exceptions";
import {parse} from "node-html-parser";
import {logger} from "../common/logger";

export const nanoId = z.string().length(8);
export const uuidId = z.string().uuid();
export const required = z.string();

const privateAssetBucket = process.env.CRM_ASSET_BUCKET
const privateAssetBucketUrl = `https://${privateAssetBucket}.s3.eu-central-1.amazonaws.com`

export const validateUniqueEntries = (arr: { [key: string]: any; }[], key: string, msg?: string) => {
    const allEntriesLength = arr.map(i => i[key]).length
    const distinctEntriesLength = [...new Set(arr.map(i => i[key]))].length

    if (allEntriesLength !== distinctEntriesLength) {
        logger.error(`Validation failed: ${msg || `Entries for key ${key} are not unique.`}`);
        throw new BadRequestException('apiError.entriesNotUnique')
    }
}

export const validateArticleMarkup = (markup?: string) => {
    if (!markup) return

    // Check allowed tags
    validateArticleCharacterCount(markup)
    validateAllowedTags(markup);
    validateYoutubeUrl(markup);
    validateImageTags(markup);
}

const allowedTags = new Set(["p", "strong", "em", "u", "h3", "blockquote", "ul", "li", "ol", "div", "img", "iframe"]);

const validateArticleCharacterCount = (markup: string) => {
    const root = parse(markup);
    let textContent = '';

    const traverse = (node: HTMLElement) => {
        if (node.nodeType === 3) { // Node.TEXT_NODE
            textContent += node.textContent;
        }
        node.childNodes.forEach(child => traverse(child as HTMLElement));
    };

    traverse(root as unknown as HTMLElement);

    logger.info(`Article character count: ${textContent.length}`);
    if (textContent.length > 2000) {
        throw new BadRequestException('apiError.articleCharacterCountExceeded');
    }
}

const validateAllowedTags = (markup: string) => {
    const root = parse(markup);
    const tags = root.querySelectorAll('*').map(node => node.tagName.toLowerCase());

    for (const tag of tags) {
        if (!allowedTags.has(tag)) {
            throw new BadRequestException('apiError.articleInvalidTag');
        }
    }
};

export const validateYoutubeUrl = (markup: string) => {
    const root = parse(markup);
    const iframes = root.querySelectorAll('iframe');

    for (const iframe of iframes) {
        const src = iframe.getAttribute('src');
        if (!src) {
            throw new BadRequestException(`apiError.youtubeIframeNoSrc`);
        }
        if (!src.startsWith('https://www.youtube-nocookie.com')) {
            throw new BadRequestException(`apiError.youtubeIframeInvalidSrc`);
        }
    }
}

const validateImageTags = (markup: string) => {
    const root = parse(markup);
    const images = root.querySelectorAll('img');

    for (const image of images) {
        const src = image.getAttribute('src');
        if (!src) {
            throw new BadRequestException(`apiError.imageNoSrcAttribute`);
        }
        if (!src.startsWith(privateAssetBucketUrl)) {
            throw new BadRequestException(`apiError.imageInvalidSrcAttribute`);
        }
    }
}