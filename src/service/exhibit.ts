import {Exhibit, ExhibitDao} from "../model/exhibit";
import {nanoid_8, PaginatedResults, Pagination} from "../model/common";
import {CreateExhibitDto, ExhibitDto, UpdateExhibitDto} from "../schema/exhibit";
import {undefinedIfEmpty} from "../common/functions";
import {sfnClient} from "../common/aws-clients";
import {StartExecutionCommand} from "@aws-sdk/client-sfn";
import {NotFoundException} from "../common/exceptions";
import {MutationResponseDto} from "../schema/common";
import {addLeadingZeros, convertStringToNumber, prepareAssetForUpdate, prepareAssetsForCreation, prepareAssetsForDeletion} from "./common";
import {ExposableMutation} from "../model/mutation";
import {customerService} from "./customer";
import {articleService} from "./article";

const createExhibitStepFunctionArn = process.env.CREATE_EXHIBIT_STEP_FUNCTION_ARN
const deleteExhibitStepFunctionArn = process.env.DELETE_EXHIBIT_STEP_FUNCTION_ARN
const updateExhibitStepFunctionArn = process.env.UPDATE_EXHIBIT_STEP_FUNCTION_ARN

const ZEROS = "000000"

const createExhibit = async (customerId: string, createExhibit: CreateExhibitDto): Promise<MutationResponseDto> => {
    const exhibitId = nanoid_8()

    const exhibit: Exhibit = {
        id: exhibitId,
        customerId: customerId,
        exhibitionId: createExhibit.exhibitionId,
        referenceName: createExhibit.referenceName,
        number: addLeadingZeros(createExhibit.number),
        langOptions: createExhibit.langOptions.map(lang => ({
            ...lang,
            article: articleService.processArticleImages(lang.article)
        })),
        images: createExhibit.images,
        status: "PROCESSING",
    }

    await customerService.authorizeResourceCreation(customerId, exhibit)

    const {data: exhibitCreated} = await ExhibitDao
        .create(exhibit)
        .go()

    const {audios, images, qrCode} = prepareAssetsForCreation(exhibitCreated);

    const mutation: ExposableMutation = {
        entityId: exhibitCreated.id,
        entity: exhibitCreated,
        action: "CREATE",
        actor: {
            customerId: exhibitCreated.customerId
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
    const exhibitWithImagesPresigned = await articleService.prepareArticleImages(exhibit) as Exhibit
    return mapToExhibitDto(exhibitWithImagesPresigned)
}

export interface ExhibitionsFilter {
    exhibitionId?: string,
    referenceNameLike?: string
}

const searchExhibitsForCustomer = async (customerId: string, pagination: Pagination, filters?: ExhibitionsFilter): Promise<PaginatedResults> => {
    const {pageSize, nextPageKey} = pagination
    const response = await ExhibitDao
        .query
        .byCustomer({
            customerId: customerId,
            exhibitionId: filters?.exhibitionId
        })
        .gt({
            number: ZEROS
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
            count: pageSize,
            pages: "all"
        })

    return {
        items: response.data.map(mapToExhibitDto),
        count: response.data.length,
        nextPageKey: response.cursor ?? undefined
    }
}

const getAllExhibitsForCustomer = async (customerId: string): Promise<PaginatedResults> => {
    const response = await ExhibitDao
        .query
        .byCustomer({
            customerId: customerId,
        })
        .go({
            pages: "all"
        })

    return {
        items: response.data.map(mapToExhibitDto),
        count: response.data.length,
        nextPageKey: response.cursor ?? undefined
    }
}

const updateExhibit = async (exhibitId: string, customerId: string, updateExhibit: UpdateExhibitDto): Promise<MutationResponseDto> => {
    const exhibit = await getExhibit(exhibitId, customerId)
    // TODO add audio input validation here

    await customerService.authorizeResourceUpdate(customerId, {...exhibit, langOptions: updateExhibit.langOptions})

    const {data: exhibitUpdated} = await ExhibitDao
        .patch({
            id: exhibitId
        })
        .set({
            exhibitionId: exhibit.exhibitionId,
            referenceName: updateExhibit.referenceName,
            number: addLeadingZeros(updateExhibit.number),
            langOptions: updateExhibit.langOptions.map(lang => ({
                ...lang,
                article: articleService.processArticleImages(lang.article)
            })),
            images: updateExhibit.images,
            status: "PROCESSING",
            version: Date.now(),
        })
        .go({
            response: "all_new"
        })

    const assets = prepareAssetForUpdate(exhibit, exhibitUpdated);

    const mutation: ExposableMutation = {
        entityId: exhibitUpdated.id,
        entity: exhibitUpdated,
        action: "UPDATE",
        actor: {
            customerId: exhibitUpdated.customerId,
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
            stateMachineArn: updateExhibitStepFunctionArn,
            input: JSON.stringify(mutation)
        }),
    );

    return {
        id: exhibitUpdated.id!!,
        executionArn: assetProcessingExecution.executionArn
    }
}

const deleteExhibit = async (exhibitId: string, customerId: string): Promise<MutationResponseDto> => {
    const exhibit = await getExhibit(exhibitId, customerId)

    const {privateAssetToDelete, publicAssetToDelete} = prepareAssetsForDeletion(exhibit)

    await ExhibitDao
        .remove({
            id: exhibit.id
        })
        .go()

    const mutation: ExposableMutation = {
        entityId: exhibit.id,
        entity: exhibit,
        action: "DELETE",
        actor: {
            customerId: exhibit.customerId,
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

const mapToExhibitDto = (exhibit: Exhibit): ExhibitDto => {
    return {
        id: exhibit.id,
        exhibitionId: exhibit.exhibitionId,
        referenceName: exhibit.referenceName,
        number: convertStringToNumber(exhibit.number),
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
                article: opt.article,
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
    searchExhibitsForCustomer: searchExhibitsForCustomer,
    getAllExhibitsForCustomer: getAllExhibitsForCustomer,
    deleteExhibit: deleteExhibit,
    updateExhibit: updateExhibit,
};