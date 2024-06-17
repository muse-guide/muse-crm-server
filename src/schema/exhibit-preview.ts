export interface ExhibitPreviewDto {
    id: string;
    exhibitionId: string;
    number: number;
    lang: string;
    langOptions: string[];
    title: string;
    subtitle: string;
    description?: string;
    imageUrls: string[];
    audio?: string;
}