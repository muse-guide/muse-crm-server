import {NotFoundException} from "../common/exceptions";
import {ExhibitionDao, ExhibitionPreview} from "../model/exhibition";
import {articleService} from "./article";

const appDomain = process.env.APP_DOMAIN

const getExhibitionPreview = async (exhibitionId: string, lang: string): Promise<ExhibitionPreview> => {
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

    const images = exhibition.images.map(img => `${appDomain}/asset/${exhibition.id}/images/${img.id}`)
    const audio = langOption.audio ? `${appDomain}/asset/${exhibition.id}/audios/${langOption.lang}` : undefined
    const article = articleService.preparePublicArticleImages(exhibition.id, langOption.article)

    return {
        id: exhibition.id,
        institutionId: exhibition.institutionId,
        lang: langOption.lang,
        langOptions: exhibition.langOptions.map((opt: { lang: string; }) => opt.lang),
        title: langOption.title,
        subtitle: langOption.subtitle,
        article: article,
        imageUrls: images,
        audio: audio
    }
}

export const exhibitPreviewService = {
    getExhibitionPreview: getExhibitionPreview
};