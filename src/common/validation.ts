import {z} from "zod";
import {BadRequestException} from "./exceptions";

export const id = z.string().uuid();

export const validateUniqueEntries = (arr: { [key: string]: any; }[], key: string, msg?: string) => {
    const allEntriesLength = arr.map(i => i[key]).length
    const distinctEntriesLength = [...new Set(arr.map(i => i[key]))].length

    if (allEntriesLength !== distinctEntriesLength) throw new BadRequestException(msg ?? "Array contains not unique entries")
}