import {EMPTY_STRING} from "./common.model";

export interface ImageRef {
    key: string;
    name: string;
}

export interface AssetProcessorInput {
    source: string;
    target?: string;
    action: AssetAction
}

export type AssetAction = "CREATE" | "DELETE"

export const resolvePublicKey = (exhibitionId: string, imageRef: ImageRef) => {
    const imageId = imageRef.key.replace("exhibitions/images/", EMPTY_STRING)
    return `asset/${exhibitionId}/images/${imageId}`
}

export const mapToAssetProcessorInput = (identityId: string, exhibitionId: string, imageRef: ImageRef, action: AssetAction): AssetProcessorInput => {
    const source = `private/${identityId}/${imageRef.key}`
    const target = resolvePublicKey(exhibitionId, imageRef)
    return {source, target, action}
}

export const mapQrCodeToAssetProcessorInput = (identityId: string, qrCodeUrl: string, action: AssetAction): AssetProcessorInput => {
    const source = `private/${identityId}/${qrCodeUrl}`
    return {
        source: source,
        action: action
    }
}