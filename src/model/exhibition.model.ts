import { ExhibitSnapshot } from "./exhibit.model";

export interface ExhibitionModel {
    id: string;
    institutionId: string;
    lang: string;
    langOptions: string[];
    title: string;
    subtitle: string;
    description: string;
    imageUrls: string[];
    exhibits: ExhibitSnapshot[];
}
