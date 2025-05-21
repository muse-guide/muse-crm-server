import textToSpeech from '@google-cloud/text-to-speech';
import {AudioInput, Voice} from "../model/asset";
import {google} from "@google-cloud/text-to-speech/build/protos/protos";
import ISynthesisInput = google.cloud.texttospeech.v1.ISynthesisInput;

// Creates a client
const client = new textToSpeech.TextToSpeechClient({
    apiKey: "AIzaSyA5lR4o4ANhFocl8l4Jlu7Ue-fr99yI9ns",
});

const mapVoice = (voice: Voice): { voiceId: string, gender: "MALE" | "FEMALE" } => {
    switch (voice) {
        case "MALE_1":
            return {voiceId: "pl-PL-Chirp3-HD-Puck", gender: "MALE"}
        case "FEMALE_1":
            return {voiceId: "pl-PL-Chirp3-HD-Zephyr", gender: "FEMALE"}
    }
}

export async function generateWithGoogleTTS(input: AudioInput) {
    const voiceConfig = mapVoice(input.voice);
    const audioEncoding: "MP3" = "MP3";
    const request = {
        input: {
            text: input.markup,
        },
        // Select the language and SSML voice gender (optional)
        voice: {
            voice: voiceConfig.voiceId,
            languageCode: input.lang,
            ssmlGender: voiceConfig.gender
        },
        // select the type of audio encoding
        audioConfig: {
            audioEncoding: audioEncoding
        },
    };

    // Performs the text-to-speech request
    const [response] = await client.synthesizeSpeech(request);

    return response.audioContent;
}
