import {BadRequestException, BaseException, InternalServerErrorException} from "./exceptions";
import {logger} from "./logger";
import {ZodError} from "zod";

export const responseFormatter = (statusCode: number, response?: object) => {
    return {
        statusCode: statusCode,
        body: response ? JSON.stringify(response, (key, value) => (value instanceof Set ? [...value] : value)) : ''
    };
};

export const restHandleError = (err: any) => {
    logger.error("Error:", err as Error);
    let errorResponse: BaseException = new InternalServerErrorException();

    if (err instanceof BaseException) {
        errorResponse = err;
    }
    if (err instanceof ZodError) {
        errorResponse = new BadRequestException(`apiError.invalidRequest`)
    }

    return {
        statusCode: errorResponse.statusCode,
        headers: {
            "Content-Type": "text/plain",
            "x-amzn-ErrorType": err.code
        },
        isBase64Encoded: false,
        body: JSON.stringify({
            message: errorResponse.message
        })
    };
}

export const handleError = (err: unknown) => {
    logger.error("Error:", err as Error);
    let errorResponse: BaseException = new InternalServerErrorException();

    if (err instanceof BaseException) {
        errorResponse = err;
    }
    if (err instanceof ZodError) {
        errorResponse = new BadRequestException(`apiError.invalidRequest`)
    }

    throw errorResponse
}