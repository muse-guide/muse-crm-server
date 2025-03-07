import {NotFoundException} from "../common/exceptions";
import {Exhibition, ExhibitionDao} from "../model/exhibition";
import {MutationResponse, nanoid_8, PaginatedResults, Pagination} from "../model/common";
import {CreateExhibitionRequest, UpdateExhibitionRequest} from "../schema/exhibition";
import {undefinedIfEmpty} from "../common/functions";
import {sfnClient} from "../common/aws-clients";
import {StartExecutionCommand} from "@aws-sdk/client-sfn";
import {prepareAssetForUpdate, prepareAssetsForCreation, prepareAssetsForDeletion} from "./common";
import {ExposableMutation} from "../model/mutation";
import {customerService} from "./customer";
import {articleService} from "./article";
import {institutionService} from "./institution";
import {logger} from "../common/logger";

const createExhibitionStepFunctionArn = process.env.CREATE_EXHIBITION_STEP_FUNCTION_ARN
const deleteExhibitionStepFunctionArn = process.env.DELETE_EXHIBITION_STEP_FUNCTION_ARN
const updateExhibitionStepFunctionArn = process.env.UPDATE_EXHIBITION_STEP_FUNCTION_ARN

const createExhibition = async (customerId: string, createExhibition: CreateExhibitionRequest): Promise<MutationResponse> => {
    const exhibitionId = nanoid_8()

    const exhibition: Exhibition = {
        id: exhibitionId,
        customerId: customerId,
        includeInstitutionInfo: createExhibition.includeInstitutionInfo,
        referenceName: createExhibition.referenceName,
        langOptions: createExhibition.langOptions.map(lang => ({
            ...lang,
            article: articleService.processArticleImages(lang.article)
        })),
        images: createExhibition.images,
        status: "PROCESSING",
    }

    await customerService.authorizeResourceCreation(customerId, exhibition)
    const institution = await institutionService.findInstitutionForCustomer(customerId)

    const {data: exhibitionCreated} = await ExhibitionDao
        .create({
            ...exhibition,
            institutionId: institution?.id
        })
        .go()

    const {audios, images, qrCode} = prepareAssetsForCreation(exhibitionCreated);

    const mutation: ExposableMutation = {
        entityId: exhibitionCreated.id,
        entity: exhibitionCreated,
        action: "CREATE",
        actor: {
            customerId: exhibitionCreated.customerId,
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

const updateExhibition = async (exhibitionId: string, customerId: string, updateExhibition: UpdateExhibitionRequest): Promise<MutationResponse> => {
    const exhibition = await getExhibitionForCustomer(exhibitionId, customerId)

    await customerService.authorizeResourceUpdate(customerId, {...exhibition, langOptions: updateExhibition.langOptions})

    const {data: exhibitionUpdated} = await ExhibitionDao
        .patch({
            id: exhibitionId
        }).set({
            referenceName: updateExhibition.referenceName,
            includeInstitutionInfo: updateExhibition.includeInstitutionInfo,
            langOptions: updateExhibition.langOptions.map(lang => ({
                ...lang,
                article: articleService.processArticleImages(lang.article)
            })),
            images: updateExhibition.images,
            status: "PROCESSING",
            version: Date.now(),
        })
        .go({
            response: "all_new"
        })

    const assets = prepareAssetForUpdate(exhibition, exhibitionUpdated);

    const mutation: ExposableMutation = {
        entityId: exhibitionUpdated.id,
        entity: exhibitionUpdated,
        action: "UPDATE",
        actor: {
            customerId: exhibitionUpdated.customerId,
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

const deleteExhibition = async (exhibitionId: string, customerId: string): Promise<MutationResponse> => {
    const exhibition = await getExhibitionForCustomer(exhibitionId, customerId)

    const {privateAssetToDelete, publicAssetToDelete} = prepareAssetsForDeletion(exhibition)

    await ExhibitionDao
        .remove({
            id: exhibitionId
        })
        .go()

    const mutation: ExposableMutation = {
        entityId: exhibition.id,
        entity: exhibition,
        action: "DELETE",
        actor: {
            customerId: exhibition.customerId,
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

const updateInstitutionIdForAllCustomerExhibitions = async (customerId: string, institutionId: string | undefined): Promise<void> => {
    // Query all exhibitions for the given customerId
    const {data: exhibitions} = await ExhibitionDao.query.byCustomer({customerId}).go();

    // Update each exhibition with the new institutionId
    for (const exhibition of exhibitions) {
        await ExhibitionDao
            .patch({id: exhibition.id})
            .set({
                institutionId: institutionId
            })
            .go();


        const mutation: ExposableMutation = {
            entityId: exhibition.id,
            entity: exhibition,
            action: "UPDATE",
            actor: {
                customerId: exhibition.customerId,
            },
            asset: {},
        }

        // Trigger exhibition update step function for each exhibition to invalidate cdn cache
        await sfnClient.send(
            new StartExecutionCommand({
                stateMachineArn: updateExhibitionStepFunctionArn,
                input: JSON.stringify(mutation)
            }),
        );
    }
};


const getExhibitionForCustomer = async (exhibitionId: string, customerId: string): Promise<Exhibition> => {
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

export interface ExhibitionsFilter {
    referenceNameLike?: string
}

const searchExhibitionsForCustomer = async (customerId: string, pagination: Pagination, filters?: ExhibitionsFilter): Promise<PaginatedResults<Exhibition>> => {
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
        items: response.data,
        count: response.data.length,
        nextPageKey: response.cursor ?? undefined
    }
}

export const exhibitionService = {
    getExhibitionForCustomer: getExhibitionForCustomer,
    searchExhibitionsForCustomer: searchExhibitionsForCustomer,
    createExhibition: createExhibition,
    deleteExhibition: deleteExhibition,
    updateExhibition: updateExhibition,
    updateInstitutionIdForAllCustomerExhibitions: updateInstitutionIdForAllCustomerExhibitions
};