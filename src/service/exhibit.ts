import {Exhibit, ExhibitDao} from "../model/exhibit";
import {nanoid_8, PaginatedResults, Pagination} from "../model/common";
import {AudioAsset, ImageAsset, QrCodeAsset} from "../model/asset";
import {CreateExhibitDto, ExhibitDto, ExhibitMutationResponseDto} from "../schema/exhibit";
import {undefinedIfEmpty} from "../common/functions";
import {sfnClient} from "../common/aws-clients";
import {StartExecutionCommand} from "@aws-sdk/client-sfn";
import {NotFoundException} from "../common/exceptions";

const createExhibitStepFunctionArn = process.env.CREATE_EXHIBIT_STEP_FUNCTION_ARN
const deleteExhibitStepFunctionArn = process.env.DELETE_EXHIBIT_STEP_FUNCTION_ARN

const createExhibit = async (createExhibit: CreateExhibitDto, customerId: string, identityId: string): Promise<ExhibitMutationResponseDto> => {
    const exhibitId = nanoid_8()
    // TODO add audio input validation here

    const exhibit: Exhibit = {
        id: exhibitId,
        customerId: customerId,
        identityId: identityId,
        exhibitionId: createExhibit.exhibitionId,
        referenceName: createExhibit.referenceName,
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

const getExhibitsForCustomer = async (customerId: string, pagination: Pagination, exhibitionId?: string): Promise<PaginatedResults> => {
    const {pageSize, nextPageKey} = pagination
    const response = await ExhibitDao
        .query
        .byCustomer({
            customerId: customerId,
            exhibitionId: exhibitionId
        })
        .go({
            cursor: nextPageKey,
            limit: pageSize
        })

    return {
        items: response.data.map(mapToExhibitDto),
        count: response.data.length,
        nextPageKey: response.cursor ?? undefined
    }
}

const deleteExhibit = async (exhibitId: string, customerId: string): Promise<ExhibitMutationResponseDto> => {
    const exhibit = await getExhibit(exhibitId, customerId)

    const audios: AudioAsset[] = toAudioAsset(exhibit)
    const images: ImageAsset[] = toImageAsset(exhibit)
    const qrCode: QrCodeAsset = toQrCodeAsset(exhibit)

    const privateAsset = audios
        .map(item => item.privatePath)
        .concat(images.map(item => item.privatePath))
        .concat([qrCode.privatePath])

    const publicAsset = audios
        .map(item => item.publicPath)
        .concat(images.map(item => item.publicPath))

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
                private: undefinedIfEmpty(privateAsset),
                public: undefinedIfEmpty(publicAsset)
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
                privatePath: `private/${exhibit.identityId}/${img.id}`,
                publicPath: `asset/exhibit/${exhibit.id}/${img.id}`,
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

const mapToExhibitDto = (exhibit: Exhibit): ExhibitDto => {
    return {
        id: exhibit.id,
        exhibitionId: exhibit.exhibitionId,
        referenceName: exhibit.referenceName,
        qrCodeUrl: `qr-codes/${exhibit.id}.png`,
        langOptions: exhibit.langOptions.map(opt => {
            const audio = opt.audio ? {
                key: `audio/${exhibit.id}_${opt.lang}`,
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
                key: img.id,
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
};