import {Exhibit} from "../model/exhibit";
import {AudioAsset, ImageAsset, PrivateAsset, PublicAsset, QrCodeAsset, ThumbnailAsset} from "../model/asset";
import {Exhibition} from "../model/exhibition";
import {EntityStructure} from "../model/common";
import crypto from 'crypto';

const RESOURCE_NUMBER_LENGTH = 6

export type Exposable = Exhibit | Exhibition;

function isExhibit(resource: Exposable): resource is Exhibit {
    return (resource as Exhibit).exhibitionId !== undefined;
}

const toResourceType = (resource: Exposable) => isExhibit(resource) ? "exhibits" : "exhibitions";

export const toImageAsset = (resource: Exposable): ImageAsset[] => {
    const resourceType = toResourceType(resource);
    return resource.images
        .map(img => {
            return {
                tmpPath: `public/tmp/images/${img.id}`,
                privatePath: `private/${resource.identityId}/images/${img.id}`,
                publicPath: `asset/${resourceType}/${resource.id}/images/${img.id}`,
                thumbnails: {
                    privatePath: `private/${resource.identityId}/images/${img.id}_thumbnail`,
                    publicPath: `asset/${resourceType}/${resource.id}/images/${img.id}_thumbnail`,
                },
                name: img.name
            }
        })
}

export const toQrCodeAsset = (resource: Exhibit | Exhibition): QrCodeAsset => {
    const resourceType = toResourceType(resource);
    return {
        privatePath: `private/${resource.identityId}/qr-codes/${resource.id}.png`,
        value: `${resourceType}/${resource.id}`,
    }
}

export const toAudioAsset = (resource: Exhibit | Exhibition): AudioAsset[] => {
    const resourceType = toResourceType(resource);
    return resource.langOptions
        .filter(opt => opt.audio !== undefined)
        .map(opt => {
            const audio = opt.audio!!
            return {
                privatePath: `private/${resource.identityId}/audio/${resource.id}_${opt.lang}`,
                publicPath: `asset/${resourceType}/${resource.id}/audio/${opt.lang}`,
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