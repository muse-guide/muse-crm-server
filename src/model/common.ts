import {nanoid} from "nanoid";

export const nanoid_8 = () => nanoid(8)
export const nanoid_12 = () => nanoid(12)

export const supportedLanguages = ["pl-PL", "en-GB", "es-ES"] as const

export const supportedVoices = ["FEMALE_1", "MALE_1", "FEMALE_2", "MALE_2"] as const

export const resourceStatus = ["PROCESSING", "ACTIVE", "DEACTIVATED", "ERROR"] as const

export const identityStatus = ["ACTIVE", "DEACTIVATED"] as const
export const subscriptionStatus = ["LOCKED", "ACTIVE", "AWAITING_PAYMENT", "DEACTIVATED"] as const

export const subscriptionPlanOption = [
    "FREE",
    "BASIC_MONTHLY",
    "STANDARD_MONTHLY",
    "PREMIUM_MONTHLY",
    "BASIC_YEARLY",
    "STANDARD_YEARLY",
    "PREMIUM_YEARLY"
] as const
export type SubscriptionPlanOption =
    "FREE"
    | "BASIC_MONTHLY"
    | "STANDARD_MONTHLY"
    | "PREMIUM_MONTHLY"
    | "BASIC_YEARLY"
    | "STANDARD_YEARLY"
    | "PREMIUM_YEARLY";

export interface Pagination {
    pageSize: number,
    nextPageKey?: string
}

export interface PaginatedResults<T> {
    items: T[],
    count: number,
    nextPageKey?: string | undefined
}

export type EntityStructure = { [key: string]: any; }

export type MutationResponse = {
    id: string,
    executionArn?: string
}