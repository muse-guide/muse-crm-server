import {PollyClient, SynthesizeSpeechCommand, SynthesizeSpeechCommandInput, SynthesizeSpeechCommandOutput} from "@aws-sdk/client-polly";
import {LanguageCode} from "@aws-sdk/client-polly/dist-types/models/models_0";
import {AudioGenerationException} from "../common/exceptions";
import {AudioAsset, Voice} from "../model/asset";

export interface AudioGeneratorInput {
    lang: string,
    markup: string,
}

export interface AudioGenerator {
    voice: string
    synthesize(input: AudioGeneratorInput): Promise<Uint8Array>
    normalize(markup: string): string
}

export class PollyAudioGenerator implements AudioGenerator {

    client = new PollyClient()

    voice: Voice = "FEMALE_1"

    async synthesize(input: AudioGeneratorInput): Promise<Uint8Array> {
        const normalized = this.normalize(input.markup)
        const ttsInput: SynthesizeSpeechCommandInput = { // SynthesizeSpeechInput
            Engine: "neural",
            LanguageCode: input.lang as LanguageCode,
            OutputFormat: "mp3",
            Text: normalized,
            TextType: "ssml",
            VoiceId: "Ola"
        };

        const command = new SynthesizeSpeechCommand(ttsInput);
        const response: SynthesizeSpeechCommandOutput = await this.client.send(command);

        if (!response.AudioStream) throw new AudioGenerationException()
        return response.AudioStream?.transformToByteArray()
    }

    normalize(markup: string): string {
        return `<speak>${markup}</speak>`;
    }
}

class AudioService {

    audioGenerators: AudioGenerator[] = [
        new PollyAudioGenerator()
    ]

    generate(input: AudioAsset) {
        const mp3 = this.audioGenerators
            .find(gen => gen.voice === input.voice)
            ?.synthesize({
                lang: input.lang,
                markup: input.markup
            })

        if (!mp3) throw new AudioGenerationException("No generator found for selected Voice")

        return mp3
    }
}

export const audioService = new AudioService()