import {NotFoundException} from "../common/exceptions";
import {Exhibit, ExhibitDao} from "../model/exhibit";
import {ExhibitPreviewDto} from "../schema/exhibit-preview";
import {addLeadingZeros, convertStringToNumber} from "./common";
import {PaginatedResults, Pagination} from "../model/common";

const getExhibitPreview = async (exhibitId: string, lang: string): Promise<ExhibitPreviewDto> => {
    const {data: exhibit} = await ExhibitDao
        .get({
            id: exhibitId
        })
        .go()

    return mapToExhibitPreviewDto(lang, exhibit)
}

export interface ExhibitsFilter {
    exhibitionId: string;
    lang: string;
    number?: number;
}

const getExhibitPreviewsFor = async (pagination: Pagination, filters: ExhibitsFilter): Promise<PaginatedResults> => {
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
            limit: 100
        })

    return {
        items: response.data.map(exhibit => mapToExhibitPreviewDto(filters.lang, exhibit)),
        count: response.data.length,
        nextPageKey: response.cursor ?? undefined
    }
}

const mapToExhibitPreviewDto = (lang: string, exhibit: Exhibit | null): ExhibitPreviewDto => {
    if (!exhibit || exhibit.langOptions.length < 1) {
        throw new NotFoundException("Exhibit does not exist.")
    }

    const requestedLangOption = exhibit.langOptions.find((opt: { lang: string; }) => opt.lang === lang)
    const langOption = requestedLangOption ?? exhibit.langOptions[0]

    const images = exhibit.images.map(img => `asset/exhibits/${exhibit.id}/images/${img.id}`)
    const audio = langOption.audio ? `asset/exhibits/${exhibit.id}/audio/${langOption.lang}` : undefined

    return {
        id: exhibit.id,
        exhibitionId: exhibit.exhibitionId,
        number: convertStringToNumber(exhibit.number),
        lang: langOption.lang,
        langOptions: exhibit.langOptions.map((opt: { lang: string; }) => opt.lang),
        title: langOption.title,
        subtitle: langOption.subtitle,
        description: langOption.description,
        imageUrls: images,
        audio: audio
    }

}

export const exhibitPreviewService = {
    getExhibitPreview: getExhibitPreview,
    getExhibitPreviewsFor: getExhibitPreviewsFor
};