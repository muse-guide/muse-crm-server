import textToSpeech, {TextToSpeechClient} from '@google-cloud/text-to-speech';
import {AudioInput, Voice} from "../model/asset";
import {AudioGenerationException} from "../common/exceptions";
import {getSecureStringParameter} from "../common/functions";

const getClient = async (): Promise<TextToSpeechClient> => {
    const apiKey = await getSecureStringParameter(process.env.GOOGLE_TTS_API_KEY_PARAMETER_NAME!!);
    if (!apiKey) {
        throw new AudioGenerationException("apiError.audioGenerationNoApiKey");
    }

    return new textToSpeech.TextToSpeechClient({
        apiKey: apiKey,
    });
}

const mapVoice = (voice: Voice): { voiceId: string, gender: "MALE" | "FEMALE" } => {
    switch (voice) {
        case "MALE_2":
            return {voiceId: "pl-PL-Chirp3-HD-Puck", gender: "MALE"}
        case "FEMALE_2":
            return {voiceId: "pl-PL-Chirp3-HD-Zephyr", gender: "FEMALE"}
        default:
            throw new AudioGenerationException(`apiError.audioGenerationVoiceNotSupported`);
    }
}

export async function generateWithGoogleTTS(input: AudioInput): Promise<Buffer> {
    const client = await getClient();
    const voiceConfig = mapVoice(input.voice);
    const audioEncoding: "MP3" = "MP3";
    const request = {
        input: {
            text: input.markup,
        },
        voice: {
            voice: voiceConfig.voiceId,
            languageCode: input.lang,
            ssmlGender: voiceConfig.gender
        },
        audioConfig: {
            audioEncoding: audioEncoding
        },
    };

    const [response] = await client.synthesizeSpeech(request);

    if (!response.audioContent) {
        throw new AudioGenerationException("apiError.audioGenerationNoAudioGenerated");
    }

    return Buffer.from(response.audioContent as Uint8Array);
}
