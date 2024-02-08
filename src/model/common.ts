import {nanoid} from "nanoid";
import {AssetProcessorInput} from "./asset";

export interface StateMachineInput {
    sub: string;
    path?: { [name: string]: string | undefined };
    querystring?: { [name: string]: string | undefined };
    header?: { [name: string]: string | undefined };
    body?: any;
}

export const nanoid_8 = () => nanoid(8)

export const EMPTY_STRING = ""

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
        toDelete?: DeleteAsset[]
    }
}

export interface QrCodeAsset {
    path: string,
    value: string,
}

export interface ImageAsset {
    privatePath: string,
    publicPath: string,
}

export interface AudioAsset {
    privatePath: string,
    publicPath: string,
    lang: string,
    markup: string
}

export interface DeleteAsset {
    privatePath: string,
    publicPath?: string,
}

export interface MutationContext {
    mutation: Mutation,
    assetToProcess?: AssetProcessorInput[]
}

export interface Actor {
    customerId: string,
    identityId?: string
}

export type MutationAction = "CREATED" | "UPDATED" | "DELETED"

export interface Pagination {
    pageSize: number,
    nextPageKey?: string
}

export interface PaginatedResults {
    items: EntityStructure[],
    count: number,
    nextPageKey?: string | undefined
}

export type EntityStructure = { [key: string]: any; }
