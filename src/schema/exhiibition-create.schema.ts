import {z} from "zod";

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

export type CreateExhibition = z.infer<typeof createExhibitionSchema>;