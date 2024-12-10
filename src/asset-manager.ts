import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {uuidId} from "./schema/validation";
import {responseFormatter, restHandleError} from "./common/response-formatter";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {generateGetPreSignedUrlRequest, GenerateGetPreSignedUrlRequestDto, GeneratePreSignedUrlResponseDto, generatePutPreSignedUrlRequest, GeneratePutPreSignedUrlRequestDto} from "./schema/asset";
import {assetService} from "./service/asset";

const generateGetPreSignedUrl = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)
        const request: GenerateGetPreSignedUrlRequestDto = generateGetPreSignedUrlRequest.parse(event.body)

        const preSignedUrl = await assetService.createGetPreSignedUrlFor({
            customerId: customerId,
            assetId: request.assetId,
            assetType: request.assetType
        })

        const response: GeneratePreSignedUrlResponseDto = {
            url: preSignedUrl
        }
        return responseFormatter(200, response)
    } catch (err) {
        return restHandleError(err);
    }
}


export const generateGetPreSignedUrlHandler = middy(generateGetPreSignedUrl);
generateGetPreSignedUrlHandler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))

const generatePutPreSignedUrl = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)
        const request: GeneratePutPreSignedUrlRequestDto = generatePutPreSignedUrlRequest.parse(event.body)

        const preSignedUrl = await assetService.createPutPreSignedUrlFor({
            customerId: customerId,
            assetId: request.assetId,
            contentType: request.contentType
        })

        const response = {
            url: preSignedUrl
        }
        return responseFormatter(200, response)
    } catch (err) {
        return restHandleError(err);
    }
}


export const generatePutPreSignedUrlHandler = middy(generatePutPreSignedUrl);
generatePutPreSignedUrlHandler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))