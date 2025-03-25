export interface PrivateAsset {
    privatePath: string,
}

export interface PublicAsset {
    publicPath: string,
}

export interface QrCodeAsset extends PrivateAsset {
    value: string,
}

export interface ImageAsset extends PrivateAsset, PublicAsset {
    thumbnails: ThumbnailAsset,
    tmpPath: string,
}

export interface ThumbnailAsset extends PrivateAsset, PublicAsset {
}

export type Voice = "FEMALE_1" | "MALE_1"

export interface AudioInput {
    markup: string,
    voice: Voice,
    lang: string
}

export interface AudioAsset extends AudioInput, PrivateAsset, PublicAsset {
    billableTokens: number,
}

const availableSsmlTags = [
    /<break\/>/g,
    /<break time="[^"]+"\/>/g,
    /<lang xml:lang="[^"]+">/g,
    /<\/lang>/g,
]

export const getBillableCharacterCount = (markup: string): number => {
    let cleanedCharacters = markup;
    for (const tags in availableSsmlTags) {
        cleanedCharacters = cleanedCharacters.replaceAll(availableSsmlTags[tags], '');
    }
    return cleanedCharacters.length;
}

export interface DeleteAsset {
    private?: string[],
    public?: string[],
}

export interface Image {
    id: string;
    name: string;
}

export type AssetType = "images" | "audios" | "qrcodes" | "tmp"
export const assetType = ["images", "audios", "qrcodes", "tmp"] as const;