import {Exhibit, ExhibitDao} from "../model/exhibit";
import {nanoid_8} from "../model/common";
import {AudioAsset, ImageAsset, QrCodeAsset} from "../model/asset";
import {CreateExhibitDto, CreateExhibitResponseDto} from "../schema/exhibit";
import {undefinedIfEmpty} from "../common/functions";
import {sfnClient} from "../common/aws-clients";
import {StartExecutionCommand} from "@aws-sdk/client-sfn";
import {required} from "../schema/validation";
import {Exhibition, ExhibitionDao} from "../model/exhibition";
import {NotFoundException} from "../common/exceptions";

const createExhibitStepFunctionArn = required.parse(process.env.CREATE_EXHIBIT_STEP_FUNCTION_ARN)

const createExhibit = async (createExhibit: CreateExhibitDto, customerId: string, identityId: string): Promise<CreateExhibitResponseDto> => {
    const exhibitId = nanoid_8()

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

    const assetCreationExecution = await sfnClient.send(
        new StartExecutionCommand({
            stateMachineArn: createExhibitStepFunctionArn,
            input: JSON.stringify(mutation)
        }),
    );

    return {
        id: exhibitCreated.id,
        executionArn: assetCreationExecution.executionArn
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

export const exhibitService = {
    createExhibit: createExhibit,
};