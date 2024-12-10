import {z} from "zod";
import {supportedLanguages, supportedVoices} from "../model/common";
import {AudioDto, ImageDto} from "./common";

export const createExhibitionSchema = z.object({
    referenceName: z.string().min(1).max(200),
    institutionId: z.string().length(8),
    includeInstitutionInfo: z.boolean(),
    langOptions: z.array(z.object({
        lang: z.enum(supportedLanguages),
        title: z.string().min(1).max(120),
        subtitle: z.string().min(1).max(200),
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

export type CreateExhibitionDto = z.infer<typeof createExhibitionSchema>;

export const updateExhibitionSchema = z.object({
    referenceName: z.string().min(1).max(200),
    includeInstitutionInfo: z.boolean(),
    langOptions: z.array(z.object({
        lang: z.enum(supportedLanguages),
        title: z.string().min(1).max(120),
        subtitle: z.string().min(1).max(200),
        article: z.string().min(1).optional(),
        audio: z.object({
            markup: z.string().min(1),
            voice: z.enum(supportedVoices),
        }).optional()
    })),
    images: z.array(z.object({
        id: z.string().min(1),
        name: z.string().min(1)
    }))
})

export type UpdateExhibitionDto = z.infer<typeof updateExhibitionSchema>;

export interface ExhibitionDto {
    id: string,
    institutionId: string,
    referenceName: string,
    includeInstitutionInfo: boolean,
    langOptions: {
        lang: string,
        title: string,
        subtitle: string,
        article?: string,
        audio?: AudioDto
    }[],
    images: ImageDto[],
    status: string
}
