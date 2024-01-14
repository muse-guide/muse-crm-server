import {NotFoundException} from "../common/exceptions";
import {Exhibition, ExhibitionDao} from "../model/exhibition.entity";
import {Pagination} from "../clients/dynamo.client";
import {ExhibitionContext} from "../model/exhibition.model";
import {ImageRef, mapQrCodeToAssetProcessorInput, mapToAssetProcessorInput} from "../model/asset.model";
import {nanoid_8} from "../model/common.model";
import {CreateExhibition} from "../schema/exhiibition-create.schema";
import {UpdateExhibition} from "../schema/exhibition-update.schema";
import {EntityStructure} from "../model/table.model";

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

const getExhibitionsForCustomer = async (customerId: string, pagination: Pagination): Promise<Exhibition[]> => {
    const {pageSize, nextPageKey} = pagination
    const cursor: string | undefined = nextPageKey ? JSON.parse(Buffer.from(nextPageKey, "base64").toString()) : undefined
    const {data: exhibitions} = await ExhibitionDao
        .query
        .byCustomerId({
            customerId: customerId
        })
        .go({
            cursor: cursor,
            limit: pageSize
        })

    return exhibitions
}

const createExhibition = async (createExhibition: CreateExhibition, customerId: string, identityId: string): Promise<ExhibitionContext> => {
    const exhibitionId = nanoid_8()
    const exhibition: Exhibition = {
        id: exhibitionId,
        customerId: customerId,
        qrCodeUrl: `exhibitions/${exhibitionId}/qr.png`,
        version: Date.now(),
        status: "ACTIVE",
        ...createExhibition
    }

    const {data: exhibitionCreated} = await ExhibitionDao
        .create(exhibition)
        .go()

    const imagesToAdd = exhibitionCreated.images
        .map(imageRef => mapToAssetProcessorInput(identityId, exhibition.id, imageRef, 'CREATE'))

    return {
        mutation: {
            entityId: exhibition.id,
            entity: exhibition,
            action: "CREATED",
            actor: {
                customerId: exhibition.customerId,
                identityId: identityId
            }
        },
        assetToProcess: imagesToAdd
    }
}

const deleteExhibition = async (exhibitionId: string, customerId: string, identityId: string): Promise<ExhibitionContext> => {
    const exhibition = await getExhibitionForCustomer(exhibitionId, customerId)
    const imagesToDelete = exhibition.images.map(imageRef => mapToAssetProcessorInput(identityId, exhibitionId, imageRef, 'DELETE'))
    const qrCodeToDelete = mapQrCodeToAssetProcessorInput(identityId, exhibition.qrCodeUrl, 'DELETE')

    await ExhibitionDao
        .remove({
            id: exhibitionId
        })
        .go()

    return {
        mutation: {
            entityId: exhibition.id,
            entity: exhibition,
            action: "DELETED",
            actor: {
                customerId: customerId,
            }
        },
        assetToProcess: imagesToDelete.concat(qrCodeToDelete)
    }

}

const updateExhibition = async (exhibitionId: string, updateExhibition: UpdateExhibition, customerId: string, identityId: string): Promise<ExhibitionContext> => {
    const exhibition = await getExhibitionForCustomer(exhibitionId, customerId)
    const requestImages = updateExhibition.images ?? []

    const {data: exhibitionUpdated} = await ExhibitionDao
        .patch({
            id: exhibitionId
        }).set({
            referenceName: updateExhibition.referenceName,
            includeInstitutionInfo: updateExhibition.includeInstitutionInfo,
            langOptions: updateExhibition.langOptions,
            images: updateExhibition.images,
            version: Date.now(),
        })
        .go()

    const imagesToProcess = resolveImageToProcess(identityId, exhibitionId, requestImages, exhibition.images)

    return {
        mutation: {
            entityId: exhibitionId,
            entity: exhibitionUpdated,
            action: "UPDATED",
            actor: {
                customerId: customerId,
                identityId: identityId
            }
        },
        assetToProcess: imagesToProcess,
    }
}

const resolveImageToProcess = (identityId: string, exhibitionId: string, requestImages: ImageRef[], existingImages: ImageRef[]) => {
    const imagesToAdd = getDifferent(requestImages, existingImages, "key")
        .map(image => mapToAssetProcessorInput(identityId, exhibitionId, image as ImageRef, 'CREATE'))
    const imagesToDelete = getDifferent(existingImages, requestImages, "key")
        .map(image => mapToAssetProcessorInput(identityId, exhibitionId, image as ImageRef, 'DELETE'))

    return imagesToAdd.concat(imagesToDelete)
}

const getDifferent = (arr1: EntityStructure[], arr2: EntityStructure[], key: string = "lang") => {
    return arr1.filter(
        option1 => !arr2.some(
            option2 => option1[key] === option2[key]
        ),
    )
}

export const exhibitService = {
    getExhibitionForCustomer: getExhibitionForCustomer,
    getExhibitionsForCustomer: getExhibitionsForCustomer,
    createExhibition: createExhibition,
    deleteExhibition: deleteExhibition,
    updateExhibition: updateExhibition,
};