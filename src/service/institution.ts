import {MutationResponse, nanoid_8} from "../model/common";
import {articleService} from "./article";
import {prepareAssetForUpdate, prepareAssetsForCreation} from "./common";
import {ExposableMutation} from "../model/mutation";
import {undefinedIfEmpty} from "../common/functions";
import {sfnClient} from "../common/aws-clients";
import {StartExecutionCommand} from "@aws-sdk/client-sfn";
import {UpsertInstitutionRequest} from "../schema/institution";
import {Institution, InstitutionDao} from "../model/institution";
import {ConfigurationException, DataConflictException, NotFoundException} from "../common/exceptions";
import {customerService} from "./customer";
import {exhibitionService} from "./exhibition";

const createInstitutionStepFunctionArn = process.env.CREATE_INSTITUTION_STEP_FUNCTION_ARN
const updateInstitutionStepFunctionArn = process.env.UPDATE_INSTITUTION_STEP_FUNCTION_ARN

const createInstitution = async (customerId: string, request: UpsertInstitutionRequest): Promise<MutationResponse> => {
    const institutionId = nanoid_8()

    const institution: Institution = {
        id: institutionId,
        customerId: customerId,
        referenceName: request.referenceName,
        langOptions: request.langOptions.map(lang => ({
            ...lang,
            article: articleService.processArticleImages(lang.article)
        })),
        images: request.images ?? [],
        kind: 'exhibition',
        status: "PROCESSING",
    }

    const {audios, images, qrCode} = prepareAssetsForCreation(institution);
    const tokensUsed = audios
        .map(audio => audio.billableTokens)
        .reduce((acc, curr) => acc + curr, 0)

    const {subscription} = await customerService.authorizeResourceCreationAndLock(customerId, institution, tokensUsed)

    const {data: institutionCreated} = await InstitutionDao
        .create(institution)
        .go()

    await exhibitionService.updateInstitutionIdForAllCustomerExhibitions(customerId, institutionCreated.id)

    const mutation: ExposableMutation = {
        entityId: institutionCreated.id,
        entity: institutionCreated,
        action: "CREATE",
        actor: {
            customerId: institutionCreated.customerId,
            subscriptionId: subscription?.subscriptionId
        },
        asset: {
            qrCode: qrCode,
            images: undefinedIfEmpty(images),
            audios: undefinedIfEmpty(audios)
        },
    }

    const assetProcessingExecution = await sfnClient.send(
        new StartExecutionCommand({
            stateMachineArn: createInstitutionStepFunctionArn,
            input: JSON.stringify(mutation)
        }),
    );

    return {
        id: institutionCreated.id,
        executionArn: assetProcessingExecution.executionArn
    }
}

const updateInstitution = async (institutionId: string, customerId: string, request: UpsertInstitutionRequest): Promise<MutationResponse> => {
    const institution = await getInstitutionInternal(institutionId, customerId)
    const processedUpdateLangOptions = request.langOptions.map(lang => {
        return {...lang, article: articleService.processArticleImages(lang.article)}
    })
    const institutionUpdateRequest = {...institution, ...request, langOptions: processedUpdateLangOptions}

    const assets = prepareAssetForUpdate(institution, institutionUpdateRequest);
    const tokensUsed = assets.audiosToAdd
        .map(audio => audio.billableTokens)
        .reduce((acc, curr) => acc + curr, 0)

    const {subscription} = await customerService.authorizeResourceUpdateAndLock(customerId, institutionUpdateRequest, tokensUsed)

    const {data: institutionUpdated} = await InstitutionDao
        .patch({
            id: institutionId
        }).set({
            referenceName: institutionUpdateRequest.referenceName,
            langOptions: institutionUpdateRequest.langOptions,
            images: institutionUpdateRequest.images,
            status: "PROCESSING",
            version: Date.now(),
        })
        .go({
            response: "all_new"
        })

    const mutation: ExposableMutation = {
        entityId: institutionUpdated.id,
        entity: institutionUpdated,
        action: "UPDATE",
        actor: {
            customerId: institutionUpdated.customerId,
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
    }

    const assetProcessingExecution = await sfnClient.send(
        new StartExecutionCommand({
            stateMachineArn: updateInstitutionStepFunctionArn,
            input: JSON.stringify(mutation)
        }),
    );

    return {
        id: institutionUpdated.id!!,
        executionArn: assetProcessingExecution.executionArn
    }
}

const getInstitutionInternal = async (institutionId: string, customerId: string): Promise<Institution> => {
    const {data: institution} = await InstitutionDao
        .get({
            id: institutionId
        })
        .go()

    if (!institution || customerId !== institution.customerId) {
        throw new NotFoundException("apiError.institutionNotExist")
    }

    if (institution.status !== "ACTIVE") {
        throw new DataConflictException("apiError.institutionNotActive")
    }

    return institution
}

const findInstitutionForCustomer = async (customerId: string): Promise<Institution | undefined> => {
    const {data: institutions} = await InstitutionDao
        .query
        .byCustomer({
            customerId: customerId
        })
        .go()

    if (institutions.length > 1) {
        throw new ConfigurationException("apiError.configurationMultipleInstitutionsFound")
    }

    if (!institutions || institutions.length === 0) {
        return undefined
    }

    return institutions[0]
}

export const institutionService = {
    createInstitution: createInstitution,
    updateInstitution: updateInstitution,
    findInstitutionForCustomer: findInstitutionForCustomer
};