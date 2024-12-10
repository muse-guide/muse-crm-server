import {z} from "zod";
import {assetType} from "../model/asset";

export const generateGetPreSignedUrlRequest = z.object({
    assetId: z.string().min(1),
    assetType: z.enum(assetType),
})

export type GenerateGetPreSignedUrlRequestDto = z.infer<typeof generateGetPreSignedUrlRequest>;

export const generatePutPreSignedUrlRequest = z.object({
    assetId: z.string().min(1),
    contentType: z.enum(["image/jpeg", "image/png", "image/*", "audio/mp3"]),
})

export type GeneratePutPreSignedUrlRequestDto = z.infer<typeof generatePutPreSignedUrlRequest>;

export type GeneratePreSignedUrlResponseDto = {
    url: string
}