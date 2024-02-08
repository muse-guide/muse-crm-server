import {NotFoundException} from "../common/exceptions";
import {ExhibitionDao} from "../model/exhibition";
import {ImageRef, resolvePublicKey} from "../model/asset";
import {ExhibitionPreviewDto} from "../schema/exhibition-preview";

const getExhibitionPreview = async (exhibitionId: string, lang: string): Promise<ExhibitionPreviewDto> => {
    const {data: exhibition} = await ExhibitionDao
        .get({
            id: exhibitionId
        })
        .go()

    if (!exhibition || exhibition.langOptions.length < 1) {
        throw new NotFoundException("Exhibition does not exist.")
    }

    const requestedLangOption = exhibition.langOptions.filter((opt: { lang: string; }) => opt.lang === lang)
    const langOption = requestedLangOption.length > 0 ? requestedLangOption[0] : exhibition.langOptions[0]
    const images = exhibition.images.map((ref: ImageRef) => resolvePublicKey(exhibitionId, ref))

    return {
        id: exhibition.id,
        institutionId: exhibition.includeInstitutionInfo ? exhibitionId : undefined,
        lang: langOption.lang,
        langOptions: exhibition.langOptions.map((opt: { lang: string; }) => opt.lang),
        title: langOption.title,
        subtitle: langOption.subtitle,
        description: langOption.description,
        imageUrls: images
    }
}

export const exhibitAppService = {
    getExhibitionForApp: getExhibitionPreview
};