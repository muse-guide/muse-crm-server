import {z} from "zod";
import {supportedLanguages, supportedVoices} from "../model/common";
import {AudioDto, ImageDto} from "./common";

export const createExhibitSchema = z.object({
    exhibitionId: z.string().length(8),
    referenceName: z.string().min(1).max(200),
    number: z.number().min(1),
    langOptions: z.array(z.object({
        lang: z.enum(supportedLanguages),
        title: z.string().min(1).max(120),
        subtitle: z.string().max(200).optional(),
        article: z.string().min(1).optional(),
        audio: z.object({
            markup: z.string().min(1).max(5000),
            voice: z.enum(supportedVoices),
        }).optional()
    })).nonempty(),
    images: z.array(z.object({
        id: z.string().min(1),
        name: z.string().min(1)
    }))
})

export type CreateExhibitDto = z.infer<typeof createExhibitSchema>;

export const updateExhibitSchema = z.object({
    referenceName: z.string().min(1).max(200),
    number: z.number().min(1),
    langOptions: z.array(z.object({
        lang: z.enum(supportedLanguages),
        title: z.string().min(1).max(120),
        subtitle: z.string().max(200).optional(),
        article: z.string().min(1).optional(),
        audio: z.object({
            markup: z.string().min(1).max(5000),
            voice: z.enum(supportedVoices),
        }).optional()
    })),
    images: z.array(z.object({
        id: z.string().min(1),
        name: z.string().min(1)
    }))
})

export type UpdateExhibitDto = z.infer<typeof updateExhibitSchema>;

export interface ExhibitDto {
    id: string,
    exhibitionId: string,
    referenceName: string,
    number: number,
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


