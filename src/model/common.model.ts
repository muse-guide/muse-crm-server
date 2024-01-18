import {nanoid} from "nanoid";
import {AssetProcessorInput} from "./asset.model";

export interface StateMachineInput {
    sub: string;
    path?: { [name: string]: string | undefined };
    querystring?: { [name: string]: string | undefined };
    header?: { [name: string]: string | undefined };
    body?: any;
}

export interface ErrorInput {
    Error: string,
    Cause: string
}

export interface ErrorCause {
    errorType: string,
    errorMessage: string,
    trace: string
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
