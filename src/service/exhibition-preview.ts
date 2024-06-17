import {NotFoundException} from "../common/exceptions";
import {ExhibitionDao} from "../model/exhibition";
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

    const requestedLangOption = exhibition.langOptions.find((opt: { lang: string; }) => opt.lang === lang)
    const langOption = requestedLangOption ?? exhibition.langOptions[0]

    const images = exhibition.images.map(img => `asset/exhibitions/${exhibition.id}/images/${img.id}`)
    const audio = langOption.audio ? `asset/exhibitions/${exhibition.id}/audio/${langOption.lang}` : undefined

    return {
        id: exhibition.id,
        institutionId: exhibition.includeInstitutionInfo ? exhibitionId : undefined,
        lang: langOption.lang,
        langOptions: exhibition.langOptions.map((opt: { lang: string; }) => opt.lang),
        title: langOption.title,
        subtitle: langOption.subtitle,
        description: langOption.description,
        imageUrls: images,
        audio: audio
    }
}

export const exhibitPreviewService = {
    getExhibitionPreview: getExhibitionPreview
};