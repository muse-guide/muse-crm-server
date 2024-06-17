import {nanoid} from "nanoid";

export const nanoid_8 = () => nanoid(8)

export const EMPTY_STRING = ""

export const supportedLanguages = ["pl-PL", "en-GB", "es-ES"] as const

export const supportedVoices = ["FEMALE_1", "MALE_1"] as const

export const status = ["PROCESSING", "ACTIVE", "ERROR"] as const

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
