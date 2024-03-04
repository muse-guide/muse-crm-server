import {z} from "zod";

export const createExhibitSchema = z.object({
    referenceName: z.string().min(1).max(64),
    exhibitionId: z.string().length(8),
    langOptions: z.array(z.object({
        lang: z.enum(["pl-PL", "en-GB", "es-ES"]),
        title: z.string().min(1).max(64),
        subtitle: z.string().min(1).max(64),
        description: z.string().min(1).max(256).optional(),
        audio: z.object({
            markup: z.string().min(1).max(1024),
            voice: z.enum(["FEMALE_1", "MALE_1"])
        }).optional(),
    })).nonempty(),
    images: z.array(z.object({
        id: z.string().min(1),
        name: z.string().min(1)
    }))
})

export type CreateExhibitDto = z.infer<typeof createExhibitSchema>;

export const updateExhibitSchema = z.object({
    referenceName: z.string().min(1).max(64).optional(),
    langOptions: z.array(z.object({
        lang: z.enum(["pl-PL", "en-GB", "es-ES"]),
        title: z.string().min(1).max(64),
        subtitle: z.string().min(1).max(64),
        description: z.string().min(1).max(256).optional(),
        audio: z.object({
            markup: z.string().min(1).max(2048),
            voice: z.enum(["FEMALE_1", "MALE_1"])
        }),
    })),
    images: z.array(z.object({
        key: z.string().min(1),
        name: z.string().min(1),
    })).optional()
})

export type CreateExhibitResponseDto = {
    id: string,
    executionArn?: string
}

export type UpdateExhibitDto = z.infer<typeof updateExhibitSchema>;

export interface ExhibitDto {
    id: string,
    exhibitionId: string,
    referenceName: string,
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
        key: string,
        name: string
    }[],
    status: string
}

