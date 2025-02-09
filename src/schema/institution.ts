import {z} from "zod";
import {supportedLanguages, supportedVoices} from "../model/common";
import {AudioDto, ImageDto} from "./common";

export const upsertInstitutionSchema = z.object({
    referenceName: z.string().min(1).max(200),
    langOptions: z.array(z.object({
        lang: z.enum(supportedLanguages),
        title: z.string().min(1).max(200),
        subtitle: z.string().min(1).max(200).optional(),
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

export type UpsertInstitutionRequest = z.infer<typeof upsertInstitutionSchema>;

export interface InstitutionDto {
    id: string,
    referenceName?: string,
    langOptions: {
        lang: string,
        title: string,
        subtitle?: string,
        article?: string,
        audio?: AudioDto
    }[],
    images: ImageDto[],
    status: string
}
