export interface ExhibitionPreviewDto {
    id: string;
    institutionId?: string;
    lang: string;
    langOptions: string[];
    title: string;
    subtitle: string;
    description?: string;
    imageUrls: string[];
}