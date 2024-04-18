import {z} from "zod";
import {supportedLanguages} from "../model/common";

export const createExhibitionSchema = z.object({
    referenceName: z.string().min(1).max(64),
    institutionId: z.string().length(8),
    includeInstitutionInfo: z.boolean(),
    langOptions: z.array(z.object({
        lang: z.enum(supportedLanguages),
        title: z.string().min(1).max(64),
        subtitle: z.string().min(1).max(64),
        description: z.string().min(1).max(256).optional(),
    })).nonempty(),
    images: z.array(z.object({
        key: z.string().min(1),
        name: z.string().min(1)
    }))
})

export type CreateExhibitionDto = z.infer<typeof createExhibitionSchema>;

export const updateExhibitionSchema = z.object({
    referenceName: z.string().min(1).max(64),
    includeInstitutionInfo: z.boolean(),
    langOptions: z.array(z.object({
        lang: z.enum(supportedLanguages),
        title: z.string().min(1).max(64),
        subtitle: z.string().min(1).max(64),
        description: z.string().min(1).max(256).optional(),
    })),
    images: z.array(z.object({
        key: z.string().min(1),
        name: z.string().min(1)
    }))
})

export type UpdateExhibitionDto = z.infer<typeof updateExhibitionSchema>;

export interface ExhibitionDto {
    id: string,
    institutionId: string,
    referenceName: string,
    qrCodeUrl: string,
    includeInstitutionInfo: boolean,
    langOptions: {
        lang: string,
        title: string,
        subtitle: string,
        description?: string
    }[],
    images: {
        key: string,
        name: string
    }[],
    status: string
}
