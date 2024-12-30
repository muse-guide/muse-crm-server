import {MutationResponseDto} from "../schema/common";
import {articleService} from "./article";
import {prepareAssetForUpdate, toQrCodeAsset} from "./common";
import {ExposableMutation} from "../model/mutation";
import {undefinedIfEmpty} from "../common/functions";
import {sfnClient} from "../common/aws-clients";
import {StartExecutionCommand} from "@aws-sdk/client-sfn";
import {InstitutionDto, UpdateInstitutionDto} from "../schema/institution";
import {Institution, InstitutionDao} from "../model/institution";
import {nanoid} from "nanoid";
import {QrCodeAsset} from "../model/asset";
import {NotFoundException} from "../common/exceptions";

const createInstitutionStepFunctionArn = process.env.CREATE_INSTITUTION_STEP_FUNCTION_ARN
const updateInstitutionStepFunctionArn = process.env.UPDATE_INSTITUTION_STEP_FUNCTION_ARN

const createDefaultInstitution = async (customerId: string): Promise<MutationResponseDto> => {
    const institutionId = nanoid()

    const institution: Institution = {
        id: institutionId,
        customerId: customerId,
        langOptions: [],
        images: [],
        status: "PROCESSING",
    }

    const {data: institutionCreated} = await InstitutionDao
        .create(institution)
        .go()

    const qrCode: QrCodeAsset = toQrCodeAsset(institution);

    const mutation: ExposableMutation = {
        entityId: institutionCreated.id,
        entity: institutionCreated,
        action: "CREATE",
        actor: {
            customerId: institutionCreated.customerId,
        },
        asset: {
            qrCode: qrCode,
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

const updateInstitution = async (institutionId: string, customerId: string, updateInstitution: UpdateInstitutionDto): Promise<MutationResponseDto> => {
    const institution = await getInstitution(institutionId, customerId)

    const {data: institutionUpdated} = await InstitutionDao
        .patch({
            id: institutionId
        }).set({
            referenceName: updateInstitution.referenceName,
            langOptions: updateInstitution.langOptions.map(lang => ({
                ...lang,
                article: articleService.processArticleImages(lang.article)
            })),
            images: updateInstitution.images,
            status: "PROCESSING",
            version: Date.now(),
        })
        .go({
            response: "all_new"
        })

    const assets = prepareAssetForUpdate(institution, institutionUpdated);

    const mutation: ExposableMutation = {
        entityId: institutionUpdated.id,
        entity: institutionUpdated,
        action: "UPDATE",
        actor: {
            customerId: institutionUpdated.customerId,
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

const getInstitution = async (institutionId: string, customerId: string): Promise<Institution> => {
    const {data: institution} = await InstitutionDao
        .get({
            id: institutionId
        })
        .go()

    if (!institution || customerId !== institution.customerId) {
        throw new NotFoundException("Exhibition does not exist.")
    }
    return institution
}

const getInstitutionForCustomer = async (institutionId: string, customerId: string): Promise<InstitutionDto> => {
    const institution = await getInstitution(institutionId, customerId)
    const institutionWithImagesPreSigned = await articleService.prepareArticleImages(institution) as Institution
    return mapToInstitutionDto(institutionWithImagesPreSigned)
}

const mapToInstitutionDto = (institution: Institution): InstitutionDto => {
    return {
        id: institution.id,
        referenceName: institution.referenceName,
        langOptions: institution.langOptions.map(opt => {
            const audio = opt.audio ? {
                key: `${institution.id}_${opt.lang}`,
                markup: opt.audio.markup,
                voice: opt.audio.voice,
            } : undefined

            return {
                lang: opt.lang,
                name: opt.name,
                department: opt.department,
                article: opt.article,
                audio: audio
            }
        }),
        images: institution.images.map(img => {
            return {
                id: img.id,
                name: img.name
            }
        }),
        status: institution.status
    }
}

export const institutionService = {
    createDefaultInstitution,
    getInstitutionForCustomer,
    updateInstitution
};