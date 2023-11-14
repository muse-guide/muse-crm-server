import {ExhibitionSnapshot} from "./exhibition-snapshot.model";

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

export interface ExhibitionMutationOutput {
    exhibition: Exhibition
    exhibitionSnapshotsToAdd: ExhibitionSnapshot[]
    exhibitionSnapshotsToDelete: ExhibitionSnapshot[]
    exhibitionSnapshotsToUpdate: ExhibitionSnapshot[]
    imagesToAdd: ImageRef[]
    imagesToDelete: ImageRef[]
    imagesToUpdate: ImageRef[]
}

type DefaultMutationValues = Omit<ExhibitionMutationOutput, 'exhibition'>;

export const mutationDefaults: DefaultMutationValues = {
    exhibitionSnapshotsToAdd: [],
    exhibitionSnapshotsToDelete: [],
    exhibitionSnapshotsToUpdate: [],
    imagesToAdd: [],
    imagesToDelete: [],
    imagesToUpdate: []
}