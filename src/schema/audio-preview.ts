import {z} from "zod";
import {supportedLanguages, supportedVoices} from "../model/common";

export const audioPreviewRequest = z.object({
    markup: z.string().min(1).max(1000),
    voice: z.enum(supportedVoices),
    lang: z.enum(supportedLanguages),
})

export type AudioPreviewRequestDto = z.infer<typeof audioPreviewRequest>;

export type AudioPreviewResponseDto = {
    audio: {
        key: string,
    }
}