import {handleError} from "./common/response-formatter";
import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {z} from "zod";
import {ExhibitionSnapshot} from "./model/exhibition-snapshot.model";
import {Exhibition} from "./model/exhibition.model";
import {exhibitionSnapshotService} from "./clients/entity.service";

const exhibitionSchema = z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    institutionId: z.string().uuid(),
    qrCodeUrl: z.string().min(1).max(64),
    referenceName: z.string().min(1).max(64),
    includeInstitutionInfo: z.boolean(),
    langOptions: z.object({
        lang: z.string().length(2),
        title: z.string().min(1).max(64),
        subtitle: z.string().min(1).max(64),
        description: z.string().min(1).max(256).optional(),
    }).array().nonempty(),
    images: z.object({
        name: z.string().min(1).max(64),
        url: z.string().url()
    }).array(),
    version: z.number().min(1)
})

const exhibitionSnapshotCreateHandler = async (event: Exhibition): Promise<Exhibition> => {
    try {
        const exhibition = exhibitionSchema.parse(event) as Exhibition
        const institutionId = exhibition.includeInstitutionInfo ? exhibition.institutionId : undefined
        const langOptions = exhibition.langOptions.map(option => option.lang)
        const imageUrls = exhibition.images.map(image => image.url)

        const exhibitionSnapshots: Array<ExhibitionSnapshot> = exhibition.langOptions
            .map(langOption => {
                return {
                    id: exhibition.id,
                    institutionId: institutionId,
                    lang: langOption.lang,
                    langOptions: langOptions,
                    title: langOption.title,
                    subtitle: langOption.subtitle,
                    description: langOption.description,
                    imageUrls: imageUrls,
                    exhibits: [],
                    version: exhibition.version,
                }
            })

        const result = exhibitionSnapshots.map(async exhibitionSnapshot => {
            return await exhibitionSnapshotService.createEntity(exhibitionSnapshot)
        })
        await Promise.all(result)

        return exhibition
    } catch (err) {
        return handleError(err);
    }
};

export const handler = middy(exhibitionSnapshotCreateHandler);
handler
    .use(httpJsonBodyParser())