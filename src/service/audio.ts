import {Readable} from "stream";
import {AudioGenerationException} from "../common/exceptions";
import {getSecureStringParameter} from "../common/functions";
import {AudioInput, Voice} from "../model/asset";
import {ElevenLabsClient} from "elevenlabs";

const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY_PARAMETER_NAME!!

const getClient = async (): Promise<ElevenLabsClient> => {
    try {
        const apiKey = await getSecureStringParameter(ELEVEN_LABS_API_KEY);
        console.log("apiKey", apiKey.slice(0, 10));
        if (!apiKey) {
            throw new AudioGenerationException("API key not found");
        }
        return new ElevenLabsClient({apiKey});
    } catch (error) {
        console.error("Error retrieving parameter:", error);
        throw new AudioGenerationException("Failed to retrieve API key");
    }
}

const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
};

const mapElevenLabsVoice = (voice: Voice): string => {
    switch (voice) {
        case "MALE_1":
            return "Brian"
        case "FEMALE_1":
            return "Sarah"
    }
}

const generateWIthElevenLabs = async (input: AudioInput): Promise<Buffer> => {
    const client = await getClient();

    const audioStream = await client.generate({
        voice: mapElevenLabsVoice(input.voice),
        text: input.markup,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
            speed: 1.0,
            stability: 0.5,
            similarity_boost: 0.75,
            use_speaker_boost: true
        }
    });

    return await streamToBuffer(audioStream);
}

const generate = async (input: AudioInput) => {
    try {
        return await generateWIthElevenLabs(input)
    } catch (error) {
        console.error("Error generating audio:", error);
        throw new AudioGenerationException("Failed to generate audio");
    }
}

export const audioService = {
    generate: generate
}