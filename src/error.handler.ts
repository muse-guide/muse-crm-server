import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {ErrorCause, ErrorInput} from "./model/common.model";
import {BaseException, InternalServerErrorException, NotFoundException} from "./common/exceptions";
import {logger} from "./common/logger";

const errorHandler = async (event: ErrorInput) => {
    try {
        logger.info(JSON.stringify(event, null, 4))
        const errorCause = JSON.parse(event.Cause) as ErrorCause
        const errorMessage = errorCause.errorMessage
        logger.info(errorMessage)
        switch (event.Error) {
            case 'NotFoundException':
                return formatResponse(new NotFoundException(errorMessage))
            default:
                return formatResponse(new InternalServerErrorException(errorMessage))
        }
    } catch (e) {
        return formatResponse(new InternalServerErrorException("Unexpected error"))
    }
};

export const handler = middy(errorHandler);
handler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))

const formatResponse = (error: BaseException) => {
    return {
        error: error.statusCode.toString(),
        cause: error.message
    };
}