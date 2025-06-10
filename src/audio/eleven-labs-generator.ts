import {Readable} from "stream";
import {AudioGenerationException} from "../common/exceptions";
import {getSecureStringParameter} from "../common/functions";
import {AudioInput, Voice} from "../model/asset";
import {ElevenLabsClient} from "elevenlabs";

const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY_PARAMETER_NAME!!

const getClient = async (): Promise<ElevenLabsClient> => {
    try {
        const apiKey = await getSecureStringParameter(ELEVEN_LABS_API_KEY);
        if (!apiKey) {
            throw new AudioGenerationException("apiError.audioGenerationNoApiKey");
        }
        return new ElevenLabsClient({apiKey});
    } catch (error) {
        console.error("Error retrieving parameter:", error);
        throw new AudioGenerationException("apiError.audioGenerationFailedToRetrieveApiKey");
    }
}

const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
};

const mapVoice = (voice: Voice): string => {
    switch (voice) {
        case "MALE_1":
            return "Brian"
        case "FEMALE_1":
            return "Sarah"
        default:
            throw new AudioGenerationException(`apiError.audioGenerationVoiceNotSupported`);
    }
}

export const generateWithElevenLabs = async (input: AudioInput): Promise<Buffer> => {
    const client = await getClient();

    const audioStream = await client.generate({
        voice: mapVoice(input.voice),
        text: input.markup,
        model_id: "eleven_multilingual_v2",
        apply_text_normalization: "on",
        voice_settings: {
            speed: 1.0,
            stability: 0.5,
            similarity_boost: 0.75,
            use_speaker_boost: true
        }
    });

    return await streamToBuffer(audioStream);
}