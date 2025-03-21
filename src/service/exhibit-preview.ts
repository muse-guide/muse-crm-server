import {NotFoundException} from "../common/exceptions";
import {Exhibit, ExhibitDao, ExhibitPreview} from "../model/exhibit";
import {ExhibitPreviewDto} from "../schema/exhibit-preview";
import {addLeadingZeros, convertStringToNumber} from "./common";
import {PaginatedResults, Pagination} from "../model/common";
import {articleService} from "./article";
import {PaginatedDtoResults} from "../schema/common";

const appDomain = process.env.APP_DOMAIN

const getExhibitPreview = async (exhibitId: string, lang: string): Promise<ExhibitPreview> => {
    const {data: exhibit} = await ExhibitDao
        .get({
            id: exhibitId
        })
        .go()

    return prepareExhibitPreview(lang, exhibit)
}

export interface ExhibitsFilter {
    exhibitionId: string;
    lang: string;
    number?: number;
}

const getExhibitPreviewsFor = async (pagination: Pagination, filters: ExhibitsFilter): Promise<PaginatedResults<ExhibitPreview>> => {
    const {pageSize, nextPageKey} = pagination
    const response = await ExhibitDao
        .query
        .byExhibition({
            exhibitionId: filters.exhibitionId,
            number: filters.number ? addLeadingZeros(filters.number) : undefined
        })
        .go({
            cursor: nextPageKey,
            count: pageSize,
            limit: 100 // TODO: remove this before production
        })

    return {
        items: response.data.map(exhibit => prepareExhibitPreview(filters.lang, exhibit)),
        count: response.data.length,
        nextPageKey: response.cursor ?? undefined
    }
}

const prepareExhibitPreview = (lang: string, exhibit: Exhibit | null): ExhibitPreview => {
    if (!exhibit || exhibit.langOptions.length < 1) {
        throw new NotFoundException("Exhibit does not exist.")
    }

    const requestedLangOption = exhibit.langOptions.find((opt: { lang: string; }) => opt.lang === lang)
    const langOption = requestedLangOption ?? exhibit.langOptions[0]

    const images = exhibit.images.map(img => `${appDomain}/asset/${exhibit.id}/images/${img.id}`)
    const audio = langOption.audio ? `${appDomain}/asset/${exhibit.id}/audios/${langOption.lang}` : undefined
    const article = articleService.preparePublicArticleImages(exhibit.id, langOption.article)

    return {
        id: exhibit.id,
        exhibitionId: exhibit.exhibitionId,
        number: convertStringToNumber(exhibit.number),
        lang: langOption.lang,
        langOptions: exhibit.langOptions.map((opt: { lang: string; }) => opt.lang),
        title: langOption.title,
        subtitle: langOption.subtitle,
        article: article,
        imageUrls: images,
        audio: audio
    }

}

export const exhibitPreviewService = {
    getExhibitPreview: getExhibitPreview,
    getExhibitPreviewsFor: getExhibitPreviewsFor
};