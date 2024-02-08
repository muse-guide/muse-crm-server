import {z} from "zod";
import {Exhibition} from "../model/exhibition";

export const createExhibitionSchema = z.object({
    referenceName: z.string().min(1).max(64),
    institutionId: z.string().length(8),
    includeInstitutionInfo: z.boolean(),
    langOptions: z.array(z.object({
        lang: z.string().length(2),
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
    referenceName: z.string().min(1).max(64).optional(),
    includeInstitutionInfo: z.boolean().optional(),
    langOptions: z.array(z.object({
        lang: z.string().length(2),
        title: z.string().min(1).max(64),
        subtitle: z.string().min(1).max(64),
        description: z.string().min(1).max(256).optional(),
    })),
    images: z.array(z.object({
        key: z.string().min(1),
        name: z.string().min(1)
    })).optional()
})

export type UpdateExhibitionDto = z.infer<typeof updateExhibitionSchema>;

export type ExhibitionDto = Omit<Exhibition, "version">
