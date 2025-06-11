import {Exhibit} from "../model/exhibit";
import {AudioAsset, ImageAsset, PrivateAsset, PublicAsset, QrCodeAsset, ThumbnailAsset, Voice} from "../model/asset";
import {Exhibition} from "../model/exhibition";
import {EntityStructure} from "../model/common";
import crypto from 'crypto';
import {articleService} from "./article";
import {Institution} from "../model/institution";

const RESOURCE_NUMBER_LENGTH = 6

export type Exposable = Exhibit | Exhibition | Institution;
export type ResourceType = "exhibits" | "exhibitions" | "institutions";

export function isInstitution(resource: Exposable): resource is Institution {
    console.log("Institution check", resource.kind);
    return resource.kind === "institution";
}

export function isExhibit(resource: Exposable): resource is Exhibit {
    console.log("Exhibit check", resource.kind);
    return resource.kind === "exhibit";
}

export function isExhibition(resource: Exposable): resource is Exhibition {
    console.log("Exhibition check", resource.kind);
    return resource.kind === "exhibition";
}

export const toResourceType = (resource: Exposable): ResourceType =>
    isExhibit(resource) ? "exhibits" : isExhibition(resource) ? "exhibitions" : "institutions";

export const toImageAsset = (resource: Exposable): ImageAsset[] => {
    const resourceImages = resource.images.map(img => mapToImageAsset(resource.customerId, resource.id, img.id));
    const articleImages = resource.langOptions.flatMap((lang) => {
        const imageIds = articleService.getArticleImages(lang.article)
        return imageIds.map(imgId => mapToImageAsset(resource.customerId, resource.id, imgId))
    });

    return [...resourceImages, ...articleImages];
}

const mapToImageAsset = (customerId: string, resourceId: string, imageId: string): ImageAsset => {
    return {
        tmpPath: `${customerId}/tmp/${imageId}`,
        privatePath: `${customerId}/images/${imageId}`,
        publicPath: `asset/${resourceId}/images/${imageId}`,
        thumbnails: {
            privatePath: `${customerId}/images/${imageId}_thumbnail`,
            publicPath: `asset/${resourceId}/images/${imageId}_thumbnail`,
        },
    }
}

export const toQrCodeAsset = (resource: Exposable): QrCodeAsset => {
    const resourceType = toResourceType(resource);
    return {
        privatePath: `${resource.customerId}/qrcodes/${resource.id}`,
        value: `${resourceType}/${resource.id}`,
    }
}

export const determineBillableTokensCount = (markup: string, voice: Voice): number => {
    let multiplier = 1;
    switch (voice) {
        // Premium voices
        case "FEMALE_1":
        case "MALE_1":
            multiplier = 5;
            break;

        // Standard voices
        case "FEMALE_2":
        case "MALE_2":
            multiplier = 1;
            break;
    }

    return markup.length * multiplier;
}

export const toAudioAsset = (resource: Exposable): AudioAsset[] => {
    return resource.langOptions
        .filter(opt => opt.audio !== undefined)
        .map(opt => {
            const audio = opt.audio!!
            return {
                privatePath: `${resource.customerId}/audios/${resource.id}_${opt.lang}`,
                publicPath: `asset/${resource.id}/audios/${opt.lang}`,
                billableTokens: determineBillableTokensCount(audio.markup, audio.voice),
                markup: audio.markup,
                voice: audio.voice,
                lang: opt.lang
            }
        })
}

export function prepareAssetsForCreation(resource: Exposable) {
    const audios: AudioAsset[] = toAudioAsset(resource);
    const images: ImageAsset[] = toImageAsset(resource);
    const qrCode: QrCodeAsset = toQrCodeAsset(resource);

    return {audios, images, qrCode};
}

export function prepareAssetForUpdate(oldResource: Exposable, newResource: Exposable) {
    const audiosOld: AudioAsset[] = toAudioAsset(oldResource);
    const imagesOld: ImageAsset[] = toImageAsset(oldResource);
    const audiosNew: AudioAsset[] = toAudioAsset(newResource);
    const imagesNew: ImageAsset[] = toImageAsset(newResource);

    const audiosToAdd = getDifferent(audiosNew, audiosOld) as AudioAsset[];
    const audiosToDelete = getDifferent(audiosOld, audiosNew) as AudioAsset[];
    const imagesToAdd = getDifferent(imagesNew, imagesOld) as ImageAsset[];
    const imagesToDelete = getDifferent(imagesOld, imagesNew) as ImageAsset[];
    const thumbnailsToDelete: ThumbnailAsset[] = imagesToDelete.map(asset => asset.thumbnails);

    const privateAssetToDelete = privateAsset(audiosToDelete, imagesToDelete, thumbnailsToDelete);
    const publicAssetToDelete = publicAsset(audiosToDelete, imagesToDelete, thumbnailsToDelete);

    return {
        audiosToAdd,
        audiosToDelete,
        imagesToAdd,
        imagesToDelete,
        privateAssetToDelete,
        publicAssetToDelete
    };
}

export function prepareAssetsForDeletion(resource: Exposable) {
    const audios: AudioAsset[] = toAudioAsset(resource);
    const images: ImageAsset[] = toImageAsset(resource);
    const thumbnails: ThumbnailAsset[] = images.map(asset => asset.thumbnails);
    const qrCode: QrCodeAsset = toQrCodeAsset(resource);

    const privateAssetToDelete = privateAsset(audios, images, thumbnails, [qrCode]);
    const publicAssetToDelete = publicAsset(audios, images, thumbnails);

    return {privateAssetToDelete, publicAssetToDelete};
}

export const getDifferent = (arr1: EntityStructure[], arr2: EntityStructure[]) => {
    return arr1.filter(
        option1 => !arr2.some(
            option2 => H(option1) === H(option2)
        ),
    )
}

const H = (obj: any): string => crypto.createHash("sha256")
    .update(JSON.stringify(obj))
    .digest("base64");

export const privateAsset = (...args: PrivateAsset[][]): string[] => {
    return args.flat().map(item => item.privatePath)
}

export const publicAsset = (...args: PublicAsset[][]): string[] => {
    return args.flat().map(item => item.publicPath)
}

export function convertStringToNumber(str: string): number {
    return parseInt(str, 10);
}

export function addLeadingZeros(num: number): string {
    let numStr = num.toString();
    while (numStr.length < RESOURCE_NUMBER_LENGTH) {
        numStr = '0' + numStr;
    }
    return numStr;
}

export function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

export function getDateString(date: Date) {
    return date.toISOString().split('T')[0];
}