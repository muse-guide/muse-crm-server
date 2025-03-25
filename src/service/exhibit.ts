import {Exhibit, ExhibitDao} from "../model/exhibit";
import {MutationResponse, nanoid_8, PaginatedResults, Pagination} from "../model/common";
import {CreateExhibitDto, UpdateExhibitDto} from "../schema/exhibit";
import {undefinedIfEmpty} from "../common/functions";
import {sfnClient} from "../common/aws-clients";
import {StartExecutionCommand} from "@aws-sdk/client-sfn";
import {NotFoundException} from "../common/exceptions";
import {addLeadingZeros, prepareAssetForUpdate, prepareAssetsForCreation, prepareAssetsForDeletion} from "./common";
import {ExposableMutation} from "../model/mutation";
import {customerService} from "./customer";
import {articleService} from "./article";
import {exhibitionService} from "./exhibition";

const createExhibitStepFunctionArn = process.env.CREATE_EXHIBIT_STEP_FUNCTION_ARN
const deleteExhibitStepFunctionArn = process.env.DELETE_EXHIBIT_STEP_FUNCTION_ARN
const updateExhibitStepFunctionArn = process.env.UPDATE_EXHIBIT_STEP_FUNCTION_ARN

const ZEROS = "000000"

const createExhibit = async (customerId: string, createExhibit: CreateExhibitDto): Promise<MutationResponse> => {
    const exhibitId = nanoid_8()
    // Validate that the exhibition exists and the customer has access to it
    const exhibition = await exhibitionService.getExhibitionForCustomer(createExhibit.exhibitionId, customerId)

    const exhibit: Exhibit = {
        id: exhibitId,
        customerId: customerId,
        exhibitionId: exhibition.id,
        referenceName: createExhibit.referenceName,
        number: addLeadingZeros(createExhibit.number),
        langOptions: createExhibit.langOptions.map(lang => ({
            ...lang,
            article: articleService.processArticleImages(lang.article)
        })),
        images: createExhibit.images,
        status: "PROCESSING",
    }

    const {audios, images, qrCode} = prepareAssetsForCreation(exhibit);
    const tokensUsed = audios
        .map(audio => audio.billableTokens)
        .reduce((acc, curr) => acc + curr, 0)

    const {subscription} = await customerService.authorizeResourceCreationAndLock(customerId, exhibit, tokensUsed)

    const {data: exhibitCreated} = await ExhibitDao
        .create(exhibit)
        .go()

    const mutation: ExposableMutation = {
        entityId: exhibitCreated.id,
        entity: exhibitCreated,
        action: "CREATE",
        actor: {
            customerId: exhibitCreated.customerId,
            subscriptionId: subscription?.subscriptionId
        },
        asset: {
            qrCode: qrCode,
            images: undefinedIfEmpty(images),
            audios: undefinedIfEmpty(audios)
        },
        billing: {
            tokensUsed: tokensUsed
        }
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

const getExhibitForCustomer = async (exhibitId: string, customerId: string): Promise<Exhibit> => {
    const {data: exhibit} = await ExhibitDao
        .get({
            id: exhibitId
        })
        .go()

    if (!exhibit || customerId !== exhibit.customerId) {
        throw new NotFoundException("Exhibit does not exist.")
    }

    if (exhibit.status !== "ACTIVE") {
        throw new NotFoundException("Exhibit is not active.")
    }

    return exhibit
}

export interface ExhibitionsFilter {
    exhibitionId?: string,
    referenceNameLike?: string
}

const searchExhibitsForCustomer = async (customerId: string, pagination: Pagination, filters?: ExhibitionsFilter): Promise<PaginatedResults<Exhibit>> => {
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
        items: response.data,
        count: response.data.length,
        nextPageKey: response.cursor ?? undefined
    }
}

const updateExhibit = async (exhibitId: string, customerId: string, updateExhibit: UpdateExhibitDto): Promise<MutationResponse> => {
    const exhibit = await getExhibitForCustomer(exhibitId, customerId)
    // TODO add audio input validation here

    const assets = prepareAssetForUpdate(exhibit, {...exhibit, langOptions: updateExhibit.langOptions});
    const tokensUsed = assets.audiosToAdd
        .map(audio => audio.billableTokens)
        .reduce((acc, curr) => acc + curr, 0)

    const {subscription} = await customerService.authorizeResourceUpdateAndLock(customerId, {...exhibit, langOptions: updateExhibit.langOptions}, tokensUsed)

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

    const mutation: ExposableMutation = {
        entityId: exhibitUpdated.id,
        entity: exhibitUpdated,
        action: "UPDATE",
        actor: {
            customerId: exhibitUpdated.customerId,
            subscriptionId: subscription?.subscriptionId
        },
        asset: {
            images: undefinedIfEmpty(assets.imagesToAdd),
            audios: undefinedIfEmpty(assets.audiosToAdd),
            delete: {
                private: undefinedIfEmpty(assets.privateAssetToDelete),
                public: undefinedIfEmpty(assets.publicAssetToDelete)
            }
        },
        billing: {
            tokensUsed: tokensUsed
        }
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

const deleteAllExhibitForExhibition = async (exhibitionId: string, customerId: string): Promise<void> => {
    const {data: exhibits} = await ExhibitDao
        .query
        .byExhibition({
            exhibitionId: exhibitionId
        })
        .go({
            pages: "all"
        })

    for (const exhibit of exhibits) {
        await deleteExhibit(exhibit.id, customerId)
    }
}

const deleteExhibit = async (exhibitId: string, customerId: string): Promise<MutationResponse> => {
    const exhibit = await getExhibitForCustomer(exhibitId, customerId)

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

export const exhibitService = {
    createExhibit: createExhibit,
    getExhibitForCustomer: getExhibitForCustomer,
    searchExhibitsForCustomer: searchExhibitsForCustomer,
    deleteExhibit: deleteExhibit,
    updateExhibit: updateExhibit,
    deleteAllExhibitForExhibition: deleteAllExhibitForExhibition
};