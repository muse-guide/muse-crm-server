export const undefinedIfEmpty = <T>(array: T[]): T[] | undefined => {
    return array.length > 0 ? array : undefined
}