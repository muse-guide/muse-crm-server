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

export class DataConflictException extends BaseException {
    constructor(message: string) {
        super(409, message);
    }
}

export class NotFoundException extends BaseException {
    constructor(message: string) {
        super(400, message);
    }
}

export class CustomerException extends BaseException {
    constructor(message: string, status?: number) {
        super(status ?? 400, message);
    }
}

export class ConfigurationException extends BaseException {
    constructor(message: string, status?: number) {
        super(status ?? 500, message);
    }
}

export class AudioGenerationException extends BaseException {
    constructor(message?: string) {
        super(500, message ?? "apiError.audioGenerationNoAudioGenerated");
    }
}

export class InternalServerErrorException extends BaseException {
    constructor(message?: string) {
        const errorMessage = message ?? "apiError.unexpectedError"
        super(500, errorMessage);
    }
}
