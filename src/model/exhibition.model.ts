export interface ExhibitionId {
    readonly id: string;
    readonly customerId: string;
}

export interface Exhibition extends ExhibitionId {
    readonly institutionId: string;
    referenceName: string;
    qrCodeUrl: string;
    includeInstitutionInfo: boolean;
    langOptions: ExhibitionLang[];
    images: ImageRef[];
    version: number;
}

export type ExhibitionUpdate = Partial<Omit<Exhibition, "id" | "customerId" | "institutionId" | "qrCodeUrl">>

export interface ExhibitionLang {
    lang: string;
    title: string;
    subtitle: string;
    description?: string;
}

export interface ImageRef {
    name: string;
    url: string;
}