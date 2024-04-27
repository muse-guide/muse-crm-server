import {z} from "zod";
import {supportedLanguages, supportedVoices} from "../model/common";

export const createExhibitSchema = z.object({
    exhibitionId: z.string().length(8),
    referenceName: z.string().min(1).max(64),
    number: z.number().min(1),
    langOptions: z.array(z.object({
        lang: z.enum(supportedLanguages),
        title: z.string().min(1).max(64),
        subtitle: z.string().min(1).max(64),
        description: z.string().min(1).max(256).optional(),
        audio: z.object({
            markup: z.string().min(1).max(1000),
            voice: z.enum(supportedVoices),
        }).optional(),
    })).nonempty(),
    images: z.array(z.object({
        id: z.string().min(1),
        name: z.string().min(1)
    }))
})

export type CreateExhibitDto = z.infer<typeof createExhibitSchema>;

export const updateExhibitSchema = z.object({
    referenceName: z.string().min(1).max(64),
    number: z.number().min(1),
    langOptions: z.array(z.object({
        lang: z.enum(supportedLanguages),
        title: z.string().min(1).max(64),
        subtitle: z.string().min(1).max(64),
        description: z.string().min(1).max(256).optional(),
        audio: z.object({
            markup: z.string().min(1).max(1000),
            voice: z.enum(supportedVoices),
        }).optional(),
    })),
    images: z.array(z.object({
        id: z.string().min(1),
        name: z.string().min(1),
    })).optional()
})

export type ExhibitMutationResponseDto = {
    id: string,
    executionArn?: string
}

export type UpdateExhibitDto = z.infer<typeof updateExhibitSchema>;

export interface ExhibitDto {
    id: string,
    exhibitionId: string,
    referenceName: string,
    number: number,
    qrCodeUrl: string,
    langOptions: {
        lang: string,
        title: string,
        subtitle: string,
        description?: string,
        audio?: {
            key: string,
            markup: string,
            voice: string,
        }
    }[],
    images: {
        id: string,
        name: string
    }[],
    status: string
}

