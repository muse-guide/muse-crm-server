export interface ExhibitionSnapshotId {
    readonly id: string;
    readonly lang: string;
}

export interface ExhibitionSnapshot extends ExhibitionSnapshotId {
    institutionId?: string;
    langOptions: string[];
    title: string;
    subtitle: string;
    description?: string;
    imageUrls: string[];
    version: number;
}

export interface ExhibitSnapshotPreview {
    readonly id: string;
    number: number;
    title: string;
    audioLength: number;
    thumbnailUrl: string;
}