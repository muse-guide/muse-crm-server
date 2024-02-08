import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'

export interface ErrorInput {
    Error: string,
    Cause: string
}

export interface ErrorCause {
    errorType: string,
    errorMessage: string,
    trace: string
}

const errorHandler = async (event: ErrorInput) => {
    const errorCause = JSON.parse(event.Cause) as ErrorCause
    const errorMessage = errorCause.errorMessage

    return {
        error: event.Error,
        cause: errorMessage
    };
};

export const handler = middy(errorHandler);
handler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))