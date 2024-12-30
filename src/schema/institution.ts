import {z} from "zod";
import {supportedLanguages, supportedVoices} from "../model/common";
import {AudioDto, ImageDto} from "./common";

export const updateInstitutionSchema = z.object({
    referenceName: z.string().min(1).max(200),
    langOptions: z.array(z.object({
        lang: z.enum(supportedLanguages),
        name: z.string().min(1).max(200),
        department: z.string().min(1).max(200).optional(),
        article: z.string().min(1).optional(),
        audio: z.object({
            markup: z.string().min(1),
            voice: z.enum(supportedVoices),
        }).optional()
    })).nonempty(),
    images: z.array(z.object({
        id: z.string().min(1),
        name: z.string().min(1)
    }))
})

export type UpdateInstitutionDto = z.infer<typeof updateInstitutionSchema>;

export interface InstitutionDto {
    id: string,
    referenceName?: string,
    langOptions: {
        lang: string,
        name: string,
        department?: string,
        article?: string,
        audio?: AudioDto
    }[],
    images: ImageDto[],
    status: string
}
