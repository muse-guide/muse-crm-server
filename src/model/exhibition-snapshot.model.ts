export interface ExhibitionSnapshot {
    id: string;
    institutionId?: string;
    lang: string;
    langOptions: string[];
    title: string;
    subtitle: string;
    description?: string;
    imageUrls: string[];
    exhibits: ExhibitSnapshotPreview[];
}

export interface ExhibitSnapshotPreview {
    id: string;
    number: number;
    title: string;
    audioLength: number;
    thumbnailUrl: string;
}