import {ExhibitionSnapshot, ExhibitionSnapshotId} from "./exhibition-snapshot.model";
import {EntityStatus, Mutation} from "./common.model";
import {AssetProcessorInput, ImageRef, resolvePublicKey} from "./asset.model";

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
    status: EntityStatus,
    version: number;
}

export interface ExhibitionLang {
    lang: string;
    title: string;
    subtitle: string;
    description?: string;
}

export interface ExhibitionContext {
    mutation: Mutation<Exhibition>,
    assetToProcess?: AssetProcessorInput[]
}

export const generateSnapshot = (langOption: ExhibitionLang, exhibition: Exhibition): ExhibitionSnapshot => {
    const availableLanguages = exhibition.langOptions.map(option => option.lang)
    const imageUrls = exhibition.images.map(image => resolvePublicKey(exhibition.id, image))

    return {
        id: exhibition.id,
        institutionId: exhibition.institutionId,
        lang: langOption.lang,
        langOptions: availableLanguages,
        title: langOption.title,
        subtitle: langOption.subtitle,
        description: langOption.description,
        imageUrls: imageUrls,
        includeInstitution: exhibition.includeInstitutionInfo,
        version: exhibition.version,
    }
}