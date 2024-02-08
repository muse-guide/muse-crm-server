import {z} from "zod";
import {Exhibit} from "../model/exhibit";

export const createExhibitSchema = z.object({
    referenceName: z.string().min(1).max(64),
    exhibitionId: z.string().length(8),
    langOptions: z.array(z.object({
        lang: z.string().length(2),
        title: z.string().min(1).max(64),
        subtitle: z.string().min(1).max(64),
        description: z.string().min(1).max(256).optional(),
        audio: z.object({
            markup: z.string().min(1).max(1024),
        }),
    })).nonempty(),
    images: z.array(z.object({
        key: z.string().min(1),
        name: z.string().min(1)
    }))
})

export type CreateExhibitDto = z.infer<typeof createExhibitSchema>;

export const updateExhibitSchema = z.object({
    referenceName: z.string().min(1).max(64).optional(),
    langOptions: z.array(z.object({
        lang: z.string().length(2),
        title: z.string().min(1).max(64),
        subtitle: z.string().min(1).max(64),
        description: z.string().min(1).max(256).optional(),
        audio: z.object({
            markup: z.string().min(1).max(1024),
        }),
    })),
    images: z.array(z.object({
        key: z.string().min(1),
        name: z.string().min(1)
    })).optional()
})

export type UpdateExhibitDto = z.infer<typeof updateExhibitSchema>;

export type ExhibitDto = Omit<Exhibit, "version">
