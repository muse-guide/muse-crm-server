import {CustomError} from "ts-custom-error";

export abstract class BaseException extends CustomError {
    statusCode: number;
    message: string;

    protected constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
    }
}

export class BadRequestException extends BaseException {
    constructor(message: string) {
        super(400, message);
    }
}

// 404 is rewrite to 200 in CDN
export class NotFoundException extends BaseException {
    constructor(message: string) {
        super(400, message);
    }
}

export class AudioGenerationException extends BaseException {
    constructor(message?: string) {
        super(500, message ?? "Failed to generate audio.");
    }
}

export class NotAuthorizedException extends BaseException {
    constructor(message?: string) {
        super(403, message ?? "Not authorized.");
    }
}

export class InternalServerErrorException extends BaseException {
    constructor(message?: string) {
        const errorMessage = message ?? "Internal server error occurred."
        super(500, errorMessage);
    }
}
