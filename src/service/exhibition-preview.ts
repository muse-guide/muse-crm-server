import {NotFoundException} from "../common/exceptions";
import {Exhibition, ExhibitionDao, ExhibitionPreview} from "../model/exhibition";
import {articleService} from "./article";
import {PaginatedResults, Pagination} from "../model/common";

const appDomain = process.env.APP_DOMAIN

export interface ExhibitionsFilter {
    institutionId: string;
    lang: string;
}

const getExhibitionPreviewsFor = async (pagination: Pagination, filters: ExhibitionsFilter): Promise<PaginatedResults<ExhibitionPreview>> => {
    const {pageSize, nextPageKey} = pagination
    const response = await ExhibitionDao
        .query
        .byInstitution({
            institutionId: filters.institutionId,
        })
        .go({
            cursor: nextPageKey,
            count: pageSize,
            limit: 100 // TODO: remove this before production
        })

    return {
        items: response.data.map(exhibition => prepareExhibitionPreview(filters.lang, exhibition)),
        count: response.data.length,
        nextPageKey: response.cursor ?? undefined
    }
}

const getExhibitionPreview = async (exhibitionId: string, lang: string): Promise<ExhibitionPreview> => {
    const {data: exhibition} = await ExhibitionDao
        .get({
            id: exhibitionId
        })
        .go()

    return prepareExhibitionPreview(lang, exhibition)
}

const prepareExhibitionPreview = (lang: string, exhibition: Exhibition | null): ExhibitionPreview => {
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

export const exhibitionPreviewService = {
    getExhibitionPreview: getExhibitionPreview,
    getExhibitionPreviewsFor: getExhibitionPreviewsFor
};