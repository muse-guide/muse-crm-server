export interface ExhibitionPreviewDto {
    id: string;
    institutionId?: string;
    lang: string;
    langOptions: string[];
    title: string;
    subtitle: string;
    article?: string;
    imageUrls: string[];
    audio?: string;
}