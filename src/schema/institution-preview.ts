export interface InstitutionPreviewDto {
    id: string;
    lang: string;
    langOptions: string[];
    title: string;
    subtitle?: string;
    article?: string;
    imageUrls: string[];
    audio?: string;
}