import {NotFoundException} from "../common/exceptions";
import {Exhibition, ExhibitionDao} from "../model/exhibition";
import {EMPTY_STRING, ImagesInput, nanoid_8, PaginatedResults, Pagination} from "../model/common";
import {ImageAsset, QrCodeAsset} from "../model/asset";
import {ExposableMutation} from "../model/mutation";
import {CreateExhibitionDto, ExhibitionDto, UpdateExhibitionDto} from "../schema/exhibition";
import {undefinedIfEmpty} from "../common/functions";

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

const getExhibitionsForCustomer = async (customerId: string, pagination: Pagination): Promise<PaginatedResults> => {
    const {pageSize, nextPageKey} = pagination
    const cursor: string | undefined = nextPageKey ? JSON.parse(Buffer.from(nextPageKey, "base64").toString()) : undefined
    const response = await ExhibitionDao
        .query
        .byCustomer({
            customerId: customerId
        })
        .go({
            cursor: cursor,
            limit: pageSize
        })

    return {
        items: response.data.map(mapToExhibitionDto),
        count: response.data.length,
        nextPageKey: response.cursor ?? undefined
    }
}

const createExhibition = async (createExhibition: CreateExhibitionDto, customerId: string, identityId: string): Promise<ExposableMutation> => {
    const exhibitionId = nanoid_8()
    const images = mapImages(exhibitionId, identityId, createExhibition.images)
    const qrCode: QrCodeAsset = {
        privatePath: `private/${identityId}/qr-codes/${nanoid_8()}.png`,
        value: `/col/${exhibitionId}`,
    }

    const exhibition: Exhibition = {
        ...createExhibition,
        id: exhibitionId,
        customerId: customerId,
        identityId: identityId,
        qrCode: qrCode,
        images: images,
        status: "ACTIVE",
    }

    const {data: exhibitionCreated} = await ExhibitionDao
        .create(exhibition)
        .go()

    return {
        entityId: exhibitionCreated.id,
        entity: exhibitionCreated,
        action: "CREATE",
        actor: {
            customerId: exhibitionCreated.customerId,
            identityId: identityId
        },
        asset: {
            qrCode: qrCode,
            images: undefinedIfEmpty(images)
        },
    }
}

const deleteExhibition = async (exhibitionId: string, customerId: string, identityId: string): Promise<ExposableMutation> => {
    const exhibition = await getExhibition(exhibitionId, customerId)

    const privateAsset = exhibition.images
        .map(img => img.privatePath)
        .concat([exhibition.qrCode.privatePath])

    const publicAsset = exhibition.images
        .map(img => img.publicPath)

    await ExhibitionDao
        .remove({
            id: exhibitionId
        })
        .go()


    return {
        entityId: exhibition.id,
        entity: exhibition,
        action: "DELETE",
        actor: {
            customerId: exhibition.customerId,
            identityId: identityId
        },
        asset: {
            delete: {
                private: undefinedIfEmpty(privateAsset),
                public: undefinedIfEmpty(publicAsset)
            }
        },
    }
}

const updateExhibition = async (exhibitionId: string, updateExhibition: UpdateExhibitionDto, customerId: string, identityId: string): Promise<ExposableMutation> => {
    const exhibition = await getExhibition(exhibitionId, customerId)
    const imagesUpdated = mapImages(exhibitionId, identityId, updateExhibition.images)

    await ExhibitionDao
        .patch({
            id: exhibitionId
        }).set({
            referenceName: updateExhibition.referenceName,
            includeInstitutionInfo: updateExhibition.includeInstitutionInfo,
            langOptions: updateExhibition.langOptions,
            images: imagesUpdated,
        })
        .go()

    const imagesToAdd = getDifferent(imagesUpdated, exhibition.images)
    const imagesToDelete = getDifferent(exhibition.images, imagesUpdated)
    const privateImages = imagesToDelete.map(img => img.privatePath)
    const publicImages = imagesToDelete.map(img => img.publicPath)

    return {
        entityId: exhibition.id,
        entity: exhibition,
        action: "UPDATE",
        actor: {
            customerId: exhibition.customerId,
            identityId: identityId
        },
        asset: {
            images: undefinedIfEmpty(imagesToAdd),
            delete: {
                private: undefinedIfEmpty(privateImages),
                public: undefinedIfEmpty(publicImages)
            }
        },
    }
}

const mapImages = (exhibitionId: string, identityId: string, refList: ImagesInput[]) => {
    return refList.map((ref: ImagesInput) => {
        return {
            privatePath: `private/${identityId}/${ref.key}`,
            publicPath: `asset/exhibition/${exhibitionId}/${ref.key}`,
            name: ref.name
        }
    })
}

const getDifferent = (arr1: ImageAsset[], arr2: ImageAsset[]) => {
    return arr1.filter(
        option1 => !arr2.some(
            option2 => option1.privatePath === option2.privatePath
        ),
    )
}

const trimIdentity = (path: string, identityId: string) => {
    return path.replace(`private/${identityId}/`, EMPTY_STRING)
}

const mapToExhibitionDto = (exhibition: Exhibition): ExhibitionDto => {
    return {
        id: exhibition.id,
        institutionId: exhibition.institutionId,
        referenceName: exhibition.referenceName,
        qrCodeUrl: trimIdentity(exhibition.qrCode.privatePath, exhibition.identityId),
        includeInstitutionInfo: exhibition.includeInstitutionInfo,
        langOptions: exhibition.langOptions,
        images: exhibition.images.map(img => {
            return {
                key: trimIdentity(img.privatePath, exhibition.identityId),
                name: img.name
            }
        }),
        status: exhibition.status
    };
}

export const exhibitService = {
    getExhibitionForCustomer: getExhibitionForCustomer,
    getExhibitionsForCustomer: getExhibitionsForCustomer,
    createExhibition: createExhibition,
    deleteExhibition: deleteExhibition,
    updateExhibition: updateExhibition,
};