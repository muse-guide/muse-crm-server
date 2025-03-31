import {AudioAsset, DeleteAsset, ImageAsset, QrCodeAsset} from "./asset";

export interface Mutation {
    entityId: string,
    entity: any,
    action: MutationAction,
    actor: Actor,
    timestamp?: string
}

export interface ExposableMutation extends Mutation {
    asset: {
        qrCode?: QrCodeAsset,
        images?: ImageAsset[],
        audios?: AudioAsset[],
        delete?: DeleteAsset
    },
}

export interface Actor {
    customerId: string,
    subscriptionId?: string
}

export type MutationAction = "CREATE" | "UPDATE" | "DELETE"
