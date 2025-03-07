import {NotFoundException} from "../common/exceptions";
import {InstitutionDao, InstitutionPreview} from "../model/institution";
import {articleService} from "./article";

const appDomain = process.env.APP_DOMAIN

const getInstitutionPreview = async (institutionId: string, lang: string): Promise<InstitutionPreview> => {
    const {data: institution} = await InstitutionDao
        .get({
            id: institutionId
        })
        .go()

    if (!institution || institution.langOptions.length < 1) {
        throw new NotFoundException("Institution does not exist.")
    }

    const requestedLangOption = institution.langOptions.find((opt: { lang: string; }) => opt.lang === lang)
    const langOption = requestedLangOption ?? institution.langOptions[0]

    const images = institution.images.map(img => `${appDomain}/asset/${institution.id}/images/${img.id}`)
    const audio = langOption.audio ? `${appDomain}/asset/${institution.id}/audios/${langOption.lang}` : undefined
    const article = articleService.preparePublicArticleImages(institution.id, langOption.article)

    return {
        id: institution.id,
        lang: langOption.lang,
        langOptions: institution.langOptions.map((opt: { lang: string; }) => opt.lang),
        title: langOption.title,
        subtitle: langOption.subtitle,
        article: article,
        imageUrls: images,
        audio: audio
    }
}

export const institutionPreviewService = {
    getInstitutionPreview: getInstitutionPreview
};