import {z} from "zod";

export const updateExhibitionSchema = z.object({
    referenceName: z.string().min(1).max(64).optional(),
    includeInstitutionInfo: z.boolean().optional(),
    langOptions: z.array(z.object({
        lang: z.string().length(2),
        title: z.string().min(1).max(64),
        subtitle: z.string().min(1).max(64),
        description: z.string().min(1).max(256).optional(),
    })).optional(),
    images: z.array(z.object({
        key: z.string().min(1),
        name: z.string().min(1)
    })).optional()
})

export type UpdateExhibition = z.infer<typeof updateExhibitionSchema>;