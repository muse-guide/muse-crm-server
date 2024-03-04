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
    name: string,
}

export type Voice = "FEMALE_1" | "MALE_1"

export interface AudioAsset extends PrivateAsset, PublicAsset {
    markup: string,
    voice: Voice,
    lang: string
}

export interface DeleteAsset {
    private?: string[],
    public?: string[],
}