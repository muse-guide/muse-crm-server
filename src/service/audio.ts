import {AudioGenerationException} from "../common/exceptions";
import {AudioInput} from "../model/asset";
import {generateWithElevenLabs} from "../audio/eleven-labs-generator";
import {generateWithGoogleTTS} from "../audio/google-tts-generator";

const generate = async (input: AudioInput) => {
    try {
        switch (input.voice) {
            case "MALE_1":
            case "FEMALE_1":
                return await generateWithElevenLabs(input)
            case "MALE_2":
            case "FEMALE_2":
                return await generateWithGoogleTTS(input)
        }
    } catch (error) {
        console.error("Error generating audio:", error);
        throw new AudioGenerationException("Failed to generate audio");
    }
}

export const audioService = {
    generate: generate
}