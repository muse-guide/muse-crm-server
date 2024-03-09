import {EMPTY_STRING} from "../model/common";

export const undefinedIfEmpty = <T>(array: T[]): T[] | undefined => {
    return array.length > 0 ? array : undefined
}

export const trimIdentity = (path: string, identityId: string) => {
    return path.replace(`private/${identityId}/`, EMPTY_STRING)
}