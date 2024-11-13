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
}

export interface DeleteAsset {
    private?: string[],
    public?: string[],
}

export interface Image {
    id: string;
    name: string;
}