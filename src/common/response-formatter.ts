import {BadRequestException, BaseException, InternalServerErrorException} from "./exceptions";
import {logger} from "./logger";
import {ZodError} from "zod";

export const responseFormatter = (statusCode: number, response?: object) => {
    return {
        statusCode: statusCode,
        body: response ? JSON.stringify(response, (key, value) => (value instanceof Set ? [...value] : value)) : ''
    };
};

export const restHandleError = (err: unknown) => {
    logger.error("Error:", err as Error);
    let errorResponse: BaseException = new InternalServerErrorException(err);

    if (err instanceof BaseException) {
        errorResponse = err;
    }
    if (err instanceof ZodError) {
        errorResponse = new BadRequestException(`Invalid request. Errors: ${err.errors.map(error => error.message).toString()}`)
    }

    return errorResponse.formatResponse();
}

export const handleError = (err: unknown) => {
    logger.error("Error:", err as Error);
    let errorResponse: BaseException = new InternalServerErrorException(err);

    if (err instanceof BaseException) {
        errorResponse = err;
    }
    if (err instanceof ZodError) {
        errorResponse = new BadRequestException(`Invalid request. Errors: [${err.errors.map(error => `path: ${error.path}, message: ${error.message}`).toString()}]`)
    }

    throw errorResponse
}