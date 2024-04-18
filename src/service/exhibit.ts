import {Exhibit, ExhibitDao} from "../model/exhibit";
import {EntityStructure, nanoid_8, PaginatedResults, Pagination} from "../model/common";
import {AudioAsset, ImageAsset, PrivateAsset, PublicAsset, QrCodeAsset, ThumbnailAsset} from "../model/asset";
import {CreateExhibitDto, ExhibitDto, ExhibitMutationResponseDto, UpdateExhibitDto} from "../schema/exhibit";
import {undefinedIfEmpty} from "../common/functions";
import {sfnClient} from "../common/aws-clients";
import {StartExecutionCommand} from "@aws-sdk/client-sfn";
import {NotFoundException} from "../common/exceptions";
import * as crypto from 'crypto';

const createExhibitStepFunctionArn = process.env.CREATE_EXHIBIT_STEP_FUNCTION_ARN
const deleteExhibitStepFunctionArn = process.env.DELETE_EXHIBIT_STEP_FUNCTION_ARN
const updateExhibitStepFunctionArn = process.env.UPDATE_EXHIBIT_STEP_FUNCTION_ARN

const createExhibit = async (customerId: string, identityId: string, createExhibit: CreateExhibitDto): Promise<ExhibitMutationResponseDto> => {
    const exhibitId = nanoid_8()
    // TODO add audio input validation here

    const exhibit: Exhibit = {
        id: exhibitId,
        customerId: customerId,
        identityId: identityId,
        exhibitionId: createExhibit.exhibitionId,
        referenceName: createExhibit.referenceName,
        number: createExhibit.number,
        langOptions: createExhibit.langOptions,
        images: createExhibit.images,
        status: "PROCESSING",
    }

    const {data: exhibitCreated} = await ExhibitDao
        .create(exhibit)
        .go()

    const audios: AudioAsset[] = toAudioAsset(exhibitCreated)
    const images: ImageAsset[] = toImageAsset(exhibitCreated)
    const qrCode: QrCodeAsset = toQrCodeAsset(exhibitCreated)

    const mutation = {
        entityId: exhibitCreated.id,
        entity: exhibitCreated,
        action: "CREATE",
        actor: {
            customerId: exhibitCreated.customerId,
            identityId: identityId
        },
        asset: {
            qrCode: qrCode,
            images: undefinedIfEmpty(images),
            audios: undefinedIfEmpty(audios)
        },
    }

    const assetProcessingExecution = await sfnClient.send(
        new StartExecutionCommand({
            stateMachineArn: createExhibitStepFunctionArn,
            input: JSON.stringify(mutation)
        }),
    );

    return {
        id: exhibitCreated.id,
        executionArn: assetProcessingExecution.executionArn
    }
}

const getExhibit = async (exhibitId: string, customerId: string): Promise<Exhibit> => {
    const {data: exhibit} = await ExhibitDao
        .get({
            id: exhibitId
        })
        .go()

    if (!exhibit || customerId !== exhibit.customerId) {
        throw new NotFoundException("Exhibit does not exist.")
    }
    return exhibit
}

const getExhibitForCustomer = async (exhibitId: string, customerId: string): Promise<ExhibitDto> => {
    const exhibit = await getExhibit(exhibitId, customerId)
    return mapToExhibitDto(exhibit)
}

export interface ExhibitsFilter {
    exhibitionId?: string,
    referenceNamePrefix?: string
}

const getExhibitsForCustomer = async (customerId: string, pagination: Pagination, filters?: ExhibitsFilter): Promise<PaginatedResults> => {
    const {pageSize, nextPageKey} = pagination
    const response = await ExhibitDao
        .query
        .byCustomer({
            customerId: customerId,
            exhibitionId: filters?.exhibitionId
        }).begins({
            referenceName: filters?.referenceNamePrefix
        })
        .go({
            cursor: nextPageKey,
            count: pageSize,
            pages: "all"
        })

    return {
        items: response.data.map(mapToExhibitDto),
        count: response.data.length,
        nextPageKey: response.cursor ?? undefined
    }
}

const updateExhibit = async (exhibitId: string, customerId: string, updateExhibit: UpdateExhibitDto): Promise<ExhibitMutationResponseDto> => {
    const exhibit = await getExhibit(exhibitId, customerId)
    // TODO add audio input validation here

    const {data: exhibitUpdated} = await ExhibitDao
        .patch({
            id: exhibitId
        })
        .set({
            exhibitionId: exhibit.exhibitionId,
            referenceName: updateExhibit.referenceName,
            number: updateExhibit.number,
            langOptions: updateExhibit.langOptions,
            images: updateExhibit.images,
            status: "PROCESSING",
        })
        .go({
            response: "all_new"
        })

    const audios: AudioAsset[] = toAudioAsset(exhibit)
    const images: ImageAsset[] = toImageAsset(exhibit)
    const audiosUpdated: AudioAsset[] = toAudioAsset(exhibitUpdated as Exhibit)
    const imagesUpdated: ImageAsset[] = toImageAsset(exhibitUpdated as Exhibit)

    const audiosToAdd = getDifferent(audiosUpdated, audios) as AudioAsset[]
    const audiosToDelete = getDifferent(audios, audiosUpdated) as AudioAsset[]
    const imagesToAdd = getDifferent(imagesUpdated, images) as ImageAsset[]
    const imagesToDelete = getDifferent(images, imagesUpdated) as ImageAsset[]
    const thumbnailsToDelete: ThumbnailAsset[] = imagesToDelete.map(asset => asset.thumbnails)

    const privateAssetToDelete = privateAsset(audiosToDelete, imagesToDelete, thumbnailsToDelete)
    const publicAssetToDelete = publicAsset(audiosToDelete, imagesToDelete, thumbnailsToDelete)

    const mutation = {
        entityId: exhibitUpdated.id,
        entity: exhibitUpdated,
        action: "UPDATE",
        actor: {
            customerId: exhibitUpdated.customerId,
            identityId: exhibitUpdated.identityId
        },
        asset: {
            images: undefinedIfEmpty(imagesToAdd),
            audios: undefinedIfEmpty(audiosToAdd),
            delete: {
                private: undefinedIfEmpty(privateAssetToDelete),
                public: undefinedIfEmpty(publicAssetToDelete)
            }
        },
    }

    const assetProcessingExecution = await sfnClient.send(
        new StartExecutionCommand({
            stateMachineArn: updateExhibitStepFunctionArn,
            input: JSON.stringify(mutation)
        }),
    );

    return {
        id: exhibitUpdated.id!!,
        executionArn: assetProcessingExecution.executionArn
    }

}

const deleteExhibit = async (exhibitId: string, customerId: string): Promise<ExhibitMutationResponseDto> => {
    const exhibit = await getExhibit(exhibitId, customerId)

    const audios: AudioAsset[] = toAudioAsset(exhibit)
    const images: ImageAsset[] = toImageAsset(exhibit)
    const thumbnails: ThumbnailAsset[] = images.map(asset => asset.thumbnails)
    const qrCode: QrCodeAsset = toQrCodeAsset(exhibit)

    const privateAssetToDelete = privateAsset(audios, images, thumbnails, [qrCode])
    const publicAssetToDelete = publicAsset(audios, images, thumbnails)

    await ExhibitDao
        .remove({
            id: exhibit.id
        })
        .go()

    const mutation = {
        entityId: exhibit.id,
        entity: exhibit,
        action: "DELETE",
        actor: {
            customerId: exhibit.customerId,
            identityId: exhibit.identityId
        },
        asset: {
            delete: {
                private: undefinedIfEmpty(privateAssetToDelete),
                public: undefinedIfEmpty(publicAssetToDelete)
            }
        },
    }

    const assetProcessingExecution = await sfnClient.send(
        new StartExecutionCommand({
            stateMachineArn: deleteExhibitStepFunctionArn,
            input: JSON.stringify(mutation)
        }),
    );

    return {
        id: exhibit.id,
        executionArn: assetProcessingExecution.executionArn
    }
}

const toAudioAsset = (exhibit: Exhibit): AudioAsset[] => {
    return exhibit.langOptions
        .filter(opt => opt.audio !== undefined)
        .map(opt => {
            const audio = opt.audio!!
            return {
                privatePath: `private/${exhibit.identityId}/audio/${exhibit.id}_${opt.lang}`,
                publicPath: `asset/exhibit/${exhibit.id}/audio/${opt.lang}`,
                markup: audio.markup,
                voice: audio.voice,
                lang: opt.lang
            }
        })
}

const toImageAsset = (exhibit: Exhibit): ImageAsset[] => {
    return exhibit.images
        .map(img => {
            return {
                tmpPath: `public/tmp/images/${img.id}`,
                privatePath: `private/${exhibit.identityId}/images/${img.id}`,
                publicPath: `asset/exhibit/${exhibit.id}/images/${img.id}`,
                thumbnails: {
                    privatePath: `private/${exhibit.identityId}/images/${img.id}_thumbnail`,
                    publicPath: `asset/exhibit/${exhibit.id}/images/${img.id}_thumbnail`,
                },
                name: img.name
            }
        })
}

const toQrCodeAsset = (exhibit: Exhibit): QrCodeAsset => {
    return {
        privatePath: `private/${exhibit.identityId}/qr-codes/${exhibit.id}.png`,
        value: `/exh/${exhibit.id}`,
    }
}

const getDifferent = (arr1: EntityStructure[], arr2: EntityStructure[]) => {
    return arr1.filter(
        option1 => !arr2.some(
            option2 => H(option1) === H(option2)
        ),
    )
}

const H = (obj: any): string => crypto.createHash("sha256")
    .update(JSON.stringify(obj))
    .digest("base64");

const privateAsset = (...args: PrivateAsset[][]): string[] => {
    return args.flat().map(item => item.privatePath)
}

const publicAsset = (...args: PublicAsset[][]): string[] => {
    return args.flat().map(item => item.publicPath)
}

const mapToExhibitDto = (exhibit: Exhibit): ExhibitDto => {
    return {
        id: exhibit.id,
        exhibitionId: exhibit.exhibitionId,
        referenceName: exhibit.referenceName,
        number: exhibit.number,
        qrCodeUrl: `qr-codes/${exhibit.id}.png`,
        langOptions: exhibit.langOptions.map(opt => {
            const audio = opt.audio ? {
                key: `${exhibit.id}_${opt.lang}`,
                markup: opt.audio.markup,
                voice: opt.audio.voice,
            } : undefined

            return {
                lang: opt.lang,
                title: opt.title,
                subtitle: opt.subtitle,
                description: opt.description,
                audio: audio
            }
        }),
        images: exhibit.images.map(img => {
            return {
                id: img.id,
                name: img.name
            }
        }),
        status: exhibit.status
    };
}

export const exhibitService = {
    createExhibit: createExhibit,
    getExhibitForCustomer: getExhibitForCustomer,
    getExhibitsForCustomer: getExhibitsForCustomer,
    deleteExhibit: deleteExhibit,
    updateExhibit: updateExhibit,
};