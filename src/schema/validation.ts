import {z} from "zod";
import {BadRequestException} from "../common/exceptions";
import {parse} from "node-html-parser";
import {logger} from "../common/logger";
import {getBillableCharacterCount} from "../model/asset";

export const nanoId = z.string().length(8);
export const nanoId_12 = z.string().length(12);
export const uuidId = z.string().uuid();
export const required = z.string();

const privateAssetBucket = process.env.CRM_ASSET_BUCKET
const privateAssetBucketUrl = `https://${privateAssetBucket}.s3.eu-central-1.amazonaws.com`

export const validateUniqueEntries = (arr: { [key: string]: any; }[], key: string, msg?: string) => {
    const allEntriesLength = arr.map(i => i[key]).length
    const distinctEntriesLength = [...new Set(arr.map(i => i[key]))].length

    if (allEntriesLength !== distinctEntriesLength) throw new BadRequestException(msg ?? "Array contains not unique entries")
}

export const validateAudioCharacterCount = (characters?: string): number => {
    if (!characters) return 0
    const billableCharacterCount = getBillableCharacterCount(characters);
    if (billableCharacterCount > 2000) throw new BadRequestException("Audio exceeds character limit")

    return billableCharacterCount
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
        throw new BadRequestException("Article exceeds character limit");
    }
}

const validateAllowedTags = (markup: string) => {
    const root = parse(markup);
    const tags = root.querySelectorAll('*').map(node => node.tagName.toLowerCase());

    for (const tag of tags) {
        if (!allowedTags.has(tag)) {
            throw new BadRequestException(`Tag <${tag}> is not allowed.`);
        }
    }
};

export const validateYoutubeUrl = (markup: string) => {
    const root = parse(markup);
    const iframes = root.querySelectorAll('iframe');

    for (const iframe of iframes) {
        const src = iframe.getAttribute('src');
        if (!src) {
            throw new BadRequestException(`Youtube iframe has no src attribute.`);
        }
        if (!src.startsWith('https://www.youtube-nocookie.com')) {
            throw new BadRequestException(`Youtube iframe src is not a youtube url.`);
        }
    }
}

const validateImageTags = (markup: string) => {
    const root = parse(markup);
    const images = root.querySelectorAll('img');

    for (const image of images) {
        const src = image.getAttribute('src');
        if (!src) {
            throw new BadRequestException(`Image tag has no src attribute.`);
        }
        if (!src.startsWith(privateAssetBucketUrl)) {
            throw new BadRequestException(`Image from unknown source.`);
        }
    }
}