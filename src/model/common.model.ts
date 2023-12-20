import {nanoid} from "nanoid";

export interface StateMachineInput {
    sub: string;
    path?: { [name: string]: string | undefined };
    querystring?: { [name: string]: string | undefined };
    header?: { [name: string]: string | undefined };
    body?: any;
}

export const nid = () => nanoid(8)

export const EMPTY_STRING= ""

export interface Mutation<ENTITY> {
    entityId: string,
    entity: ENTITY,
    action: MutationAction,
    actor: Actor,
    timestamp?: string
}

export interface Actor {
    customerId: string,
    identityId?: string
}

export type MutationAction = "CREATED" | "UPDATED" | "DELETED"

export type EntityStatus = "ACTIVE" | "ERROR"