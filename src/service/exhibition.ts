import {NotFoundException} from "../common/exceptions";
import {Exhibition, ExhibitionDao} from "../model/exhibition";
import {nanoid_8, PaginatedResults, Pagination} from "../model/common";
import {CreateExhibitionDto, ExhibitionDto, UpdateExhibitionDto} from "../schema/exhibition";
import {undefinedIfEmpty} from "../common/functions";
import {sfnClient} from "../common/aws-clients";
import {StartExecutionCommand} from "@aws-sdk/client-sfn";
import {prepareAssetForUpdate, prepareAssetsForCreation, prepareAssetsForDeletion} from "./common";
import {MutationResponseDto} from "../schema/common";

const createExhibitionStepFunctionArn = process.env.CREATE_EXHIBITION_STEP_FUNCTION_ARN
const deleteExhibitionStepFunctionArn = process.env.DELETE_EXHIBITION_STEP_FUNCTION_ARN
const updateExhibitionStepFunctionArn = process.env.UPDATE_EXHIBITION_STEP_FUNCTION_ARN

const createExhibition = async (customerId: string, identityId: string, createExhibition: CreateExhibitionDto): Promise<MutationResponseDto> => {
    const exhibitionId = nanoid_8()
    // TODO add audio input validation here

    const exhibition: Exhibition = {
        id: exhibitionId,
        customerId: customerId,
        identityId: identityId,
        institutionId: createExhibition.institutionId,
        includeInstitutionInfo: createExhibition.includeInstitutionInfo,
        referenceName: createExhibition.referenceName,
        langOptions: createExhibition.langOptions,
        images: createExhibition.images,
        status: "PROCESSING",
    }

    const {data: exhibitionCreated} = await ExhibitionDao
        .create(exhibition)
        .go()

    const {audios, images, qrCode} = prepareAssetsForCreation(exhibitionCreated);

    const mutation = {
        entityId: exhibitionCreated.id,
        entity: exhibitionCreated,
        action: "CREATE",
        actor: {
            customerId: exhibitionCreated.customerId,
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
            stateMachineArn: createExhibitionStepFunctionArn,
            input: JSON.stringify(mutation)
        }),
    );

    return {
        id: exhibitionCreated.id,
        executionArn: assetProcessingExecution.executionArn
    }
}

const getExhibition = async (exhibitionId: string, customerId: string): Promise<Exhibition> => {
    const {data: exhibition} = await ExhibitionDao
        .get({
            id: exhibitionId
        })
        .go()

    if (!exhibition || customerId !== exhibition.customerId) {
        throw new NotFoundException("Exhibition does not exist.")
    }
    return exhibition
}

const getExhibitionForCustomer = async (exhibitionId: string, customerId: string): Promise<ExhibitionDto> => {
    const exhibition = await getExhibition(exhibitionId, customerId)
    return mapToExhibitionDto(exhibition)
}

export interface ExhibitionsFilter {
    referenceNameLike?: string
}

const getExhibitionsForCustomer = async (customerId: string, pagination: Pagination, filters?: ExhibitionsFilter): Promise<PaginatedResults> => {
    const {pageSize, nextPageKey} = pagination
    const response = await ExhibitionDao
        .query
        .byCustomer({
            customerId: customerId
        })
        .where(
            (attr, op) => {
                if (filters?.referenceNameLike) {
                    return op.contains(attr.referenceName, filters.referenceNameLike)
                }
                return op.exists(attr.customerId)
            }
        )
        .go({
            cursor: nextPageKey,
            limit: pageSize,
            pages: "all"
        })

    return {
        items: response.data.map(mapToExhibitionDto),
        count: response.data.length,
        nextPageKey: response.cursor ?? undefined
    }
}

const updateExhibition = async (exhibitionId: string, customerId: string, updateExhibition: UpdateExhibitionDto): Promise<MutationResponseDto> => {
    const exhibition = await getExhibition(exhibitionId, customerId)
    // TODO add audio input validation here

    const {data: exhibitionUpdated} = await ExhibitionDao
        .patch({
            id: exhibitionId
        }).set({
            institutionId: exhibition.institutionId,
            referenceName: updateExhibition.referenceName,
            includeInstitutionInfo: updateExhibition.includeInstitutionInfo,
            langOptions: updateExhibition.langOptions,
            images: updateExhibition.images,
            status: "PROCESSING",
        })
        .go({
            response: "all_new"
        })

    const assets = prepareAssetForUpdate(exhibition, exhibitionUpdated);

    const mutation = {
        entityId: exhibitionUpdated.id,
        entity: exhibitionUpdated,
        action: "UPDATE",
        actor: {
            customerId: exhibitionUpdated.customerId,
            identityId: exhibitionUpdated.identityId
        },
        asset: {
            images: undefinedIfEmpty(assets.imagesToAdd),
            audios: undefinedIfEmpty(assets.audiosToAdd),
            delete: {
                private: undefinedIfEmpty(assets.privateAssetToDelete),
                public: undefinedIfEmpty(assets.publicAssetToDelete)
            }
        },
    }

    const assetProcessingExecution = await sfnClient.send(
        new StartExecutionCommand({
            stateMachineArn: updateExhibitionStepFunctionArn,
            input: JSON.stringify(mutation)
        }),
    );

    return {
        id: exhibitionUpdated.id!!,
        executionArn: assetProcessingExecution.executionArn
    }
}

const deleteExhibition = async (exhibitionId: string, customerId: string): Promise<MutationResponseDto> => {
    const exhibition = await getExhibition(exhibitionId, customerId)

    const {privateAssetToDelete, publicAssetToDelete} = prepareAssetsForDeletion(exhibition)

    await ExhibitionDao
        .remove({
            id: exhibitionId
        })
        .go()

    const mutation = {
        entityId: exhibition.id,
        entity: exhibition,
        action: "DELETE",
        actor: {
            customerId: exhibition.customerId,
            identityId: exhibition.identityId
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
            stateMachineArn: deleteExhibitionStepFunctionArn,
            input: JSON.stringify(mutation)
        }),
    );

    return {
        id: exhibition.id,
        executionArn: assetProcessingExecution.executionArn
    }
}

const mapToExhibitionDto = (exhibition: Exhibition): ExhibitionDto => {
    return {
        id: exhibition.id,
        institutionId: exhibition.institutionId,
        referenceName: exhibition.referenceName,
        includeInstitutionInfo: exhibition.includeInstitutionInfo,
        qrCodeUrl: `qr-codes/${exhibition.id}.png`,
        langOptions: exhibition.langOptions.map(opt => {
            const audio = opt.audio ? {
                key: `${exhibition.id}_${opt.lang}`,
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
        images: exhibition.images.map(img => {
            return {
                id: img.id,
                name: img.name
            }
        }),
        status: exhibition.status
    };
}

export const exhibitionService = {
    getExhibitionForCustomer: getExhibitionForCustomer,
    getExhibitionsForCustomer: getExhibitionsForCustomer,
    createExhibition: createExhibition,
    deleteExhibition: deleteExhibition,
    updateExhibition: updateExhibition,
};