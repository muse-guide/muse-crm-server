import middy from "@middy/core";
import {nanoId, required} from "./schema/validation";
import {responseFormatter, restHandleError} from "./common/response-formatter";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import cors from "@middy/http-cors";
import {institutionPreviewService} from "./service/institution-preview";
import {InstitutionPreview} from "./model/institution";
import {InstitutionPreviewDto} from "./schema/institution-preview";

/**
 * Gets an institution by ID for app
 *
 * @param event - The API Gateway proxy event
 * @returns The API Gateway proxy result with institution data
 */
const institutionPreviewGet = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const institutionId = nanoId.parse(event.pathParameters?.["id"])
        const lang = required.parse(event.queryStringParameters?.["lang"])
        const institution = await institutionPreviewService.getInstitutionPreview(institutionId, lang)
        const institutionDto = mapToInstitutionPreviewDto(institution)

        return responseFormatter(200, institutionDto)
    } catch (err) {
        return restHandleError(err);
    }
};

export const institutionPreviewGetHandler = middy(institutionPreviewGet);
institutionPreviewGetHandler
    .use(cors())

const mapToInstitutionPreviewDto = (institution: InstitutionPreview): InstitutionPreviewDto => {
    return {
        id: institution.id,
        lang: institution.lang,
        langOptions: institution.langOptions,
        title: institution.title,
        subtitle: institution.subtitle,
        article: institution.article,
        imageUrls: institution.imageUrls,
        audio: institution.audio
    }
}