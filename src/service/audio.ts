import {AudioGenerationException} from "../common/exceptions";
import {AudioInput} from "../model/asset";
import {generateWithElevenLabs} from "../audio/eleven-labs-generator";
import {generateWithGoogleTTS} from "../audio/google-tts-generator";

const generate = async (input: AudioInput) => {
    try {
        return await generateWithElevenLabs(input)
        // return await generateWithGoogleTTS(input)
    } catch (error) {
        console.error("Error generating audio:", error);
        throw new AudioGenerationException("Failed to generate audio");
    }
}

export const audioService = {
    generate: generate
}