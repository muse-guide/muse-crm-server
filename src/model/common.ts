import {nanoid} from "nanoid";

export const nanoid_8 = () => nanoid(8)

export const EMPTY_STRING = ""

export const supportedLanguages = ["pl-PL", "en-GB", "es-ES"] as const

export const supportedVoices = ["FEMALE_1", "MALE_1"] as const

export const resourceStatus = ["PROCESSING", "ACTIVE", "ERROR"] as const

export const identityStatus = ["PROCESSING", "ACTIVE", "DISABLED", "ERROR"] as const
export const subscriptionStatus = ["PROCESSING", "ACTIVE", "PAYMENT_MISSING", "DEACTIVATED", "ERROR"] as const

export const subscriptionType = ["FREE", "PREMIUM"] as const

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
