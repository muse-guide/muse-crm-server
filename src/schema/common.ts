import {EntityStructure} from "../model/common";

export type ImageDto = {
    id: string,
    name: string
}

export type AudioDto = {
    key: string,
    markup: string,
    voice: string
}

export interface PaginatedDtoResults {
    items: EntityStructure[],
    count: number,
    nextPageKey?: string | undefined
}