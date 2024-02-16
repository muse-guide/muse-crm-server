import {NotFoundException} from "../common/exceptions";
import {Exhibit, ExhibitDao} from "../model/exhibit";
import {ImagesInput, mapQrCodeToAssetProcessorInput, mapToAssetProcessorInput} from "../model/asset";
import {EntityStructure, MutationContext, nanoid_8, PaginatedResults, Pagination} from "../model/common";
import {CreateExhibitDto, ExhibitDto, UpdateExhibitDto} from "../schema/exhibit";

const getExhibitForCustomer = async (exhibitId: string, customerId: string): Promise<Exhibit> => {
    const {data: exhibit} = await ExhibitDao
        .get({
            id: exhibitId
        })
        .go()
    if (!exhibit || customerId !== exhibit.customerId) {
        throw new NotFoundException("Exhibit does not exist.")
    }
    return mapToExhibitDto(exhibit)
}

const getExhibitsForCustomer = async (customerId: string, pagination: Pagination): Promise<PaginatedResults> => {
    const {pageSize, nextPageKey} = pagination
    const cursor: string | undefined = nextPageKey ? JSON.parse(Buffer.from(nextPageKey, "base64").toString()) : undefined
    const response = await ExhibitDao
        .query
        .byCustomer({
            customerId: customerId
        })
        .go({
            cursor: cursor,
            limit: pageSize
        })

    return {
        items: response.data.map(mapToExhibitDto),
        count: response.data.length,
        nextPageKey: response.cursor ?? undefined
    }
}

const createExhibit = async (createExhibit: CreateExhibitDto, customerId: string, identityId: string): Promise<MutationContext> => {
    const exhibitId = nanoid_8()
    const exhibit: Exhibit = {
        ...createExhibit,
        id: exhibitId,
        customerId: customerId,
        qrCode: {
            url: `exhibits/${exhibitId}/qr.png`,
            value: `/col/${exhibitId}`
        } ,
        status: "ACTIVE",
        langOptions: createExhibit.langOptions.map(opt => {
            return {
                ...opt,
                audio: {
                    markup: opt.audio.markup,
                    url: `exhibits/${exhibitId}/audio/${opt.lang}.mp3`
                }
            }
        })
    }

    const {data: exhibitCreated} = await ExhibitDao
        .create(exhibit)
        .go()

    const imagesToAdd = exhibitCreated.images
        .map((imageRef: ImagesInput) => mapToAssetProcessorInput(identityId, exhibit.id, imageRef, 'CREATE'))

    return {
        mutation: {
            entityId: exhibitCreated.id,
            entity: exhibitCreated,
            action: "CREATED",
            actor: {
                customerId: exhibitCreated.customerId,
                identityId: identityId
            }
        },
        assetToProcess: imagesToAdd
    }
}

const deleteExhibit = async (exhibitId: string, customerId: string, identityId: string): Promise<MutationContext> => {
    const exhibit = await getExhibitForCustomer(exhibitId, customerId)
    const imagesToDelete = exhibit.images.map((imageRef: ImagesInput) => mapToAssetProcessorInput(identityId, exhibitId, imageRef, 'DELETE'))
    const qrCodeToDelete = mapQrCodeToAssetProcessorInput(identityId, exhibit.qrCodeUrl, 'DELETE')

    await ExhibitDao
        .remove({
            id: exhibitId
        })
        .go()

    return {
        mutation: {
            entityId: exhibit.id,
            entity: exhibit,
            action: "DELETED",
            actor: {
                customerId: customerId,
            }
        },
        assetToProcess: imagesToDelete.concat(qrCodeToDelete)
    }

}

const updateExhibit = async (exhibitId: string, updateExhibit: UpdateExhibitDto, customerId: string, identityId: string): Promise<MutationContext> => {
    const exhibit = await getExhibitForCustomer(exhibitId, customerId)
    const requestImages = updateExhibit.images ?? []

    const {data: exhibitUpdated} = await ExhibitDao
        .patch({
            id: exhibitId
        }).set({
            referenceName: updateExhibit.referenceName,
            includeInstitutionInfo: updateExhibit.includeInstitutionInfo,
            langOptions: updateExhibit.langOptions,
            images: updateExhibit.images,
        })
        .go()

    const imagesToProcess = resolveImageToProcess(identityId, exhibitId, requestImages, exhibit.images)

    return {
        mutation: {
            entityId: exhibitId,
            entity: exhibitUpdated,
            action: "UPDATED",
            actor: {
                customerId: customerId,
                identityId: identityId
            }
        },
        assetToProcess: imagesToProcess,
    }
}

const resolveImageToProcess = (identityId: string, exhibitId: string, requestImages: ImagesInput[], existingImages: ImagesInput[]) => {
    const imagesToAdd = getDifferent(requestImages, existingImages, "key")
        .map(image => mapToAssetProcessorInput(identityId, exhibitId, image as ImagesInput, 'CREATE'))
    const imagesToDelete = getDifferent(existingImages, requestImages, "key")
        .map(image => mapToAssetProcessorInput(identityId, exhibitId, image as ImagesInput, 'DELETE'))

    return imagesToAdd.concat(imagesToDelete)
}

const getDifferent = (arr1: EntityStructure[], arr2: EntityStructure[], key: string = "lang") => {
    return arr1.filter(
        option1 => !arr2.some(
            option2 => option1[key] === option2[key]
        ),
    )
}

const mapToExhibitDto = (exhibit: Exhibit): ExhibitDto => {
    delete exhibit.version;
    return exhibit;
}

export const exhibitService = {
    getExhibitForCustomer: getExhibitForCustomer,
    getExhibitsForCustomer: getExhibitsForCustomer,
    createExhibit: createExhibit,
    deleteExhibit: deleteExhibit,
    updateExhibit: updateExhibit,
};