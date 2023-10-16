export abstract class BaseException extends Error {
    statusCode: number;
    message: string;
    cause: unknown;

    protected constructor(statusCode: number, message: string, cause?: unknown) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.cause = cause;
    }

    formatResponse() {
        return {
            statusCode: this.statusCode,
            body: JSON.stringify({
                message: this.message,
            }),
            headers: {
                "Content-Type": "application/json",
            },
        };
    }
}

export class BadRequestException extends BaseException {
    constructor(message: string, cause?: unknown) {
        super(400, message, cause);
    }
}

export class NotFoundException extends BaseException {
    constructor(message: string, cause?: unknown) {
        super(404, message, cause);
    }
}

export class ConcurrentUpdateException extends BaseException {
    constructor(message: string, cause?: unknown) {
        super(409, message, cause);
    }
}

export class InternalServerErrorException extends BaseException {

    constructor(cause?: unknown);
    constructor(message?: string, cause?: unknown);
    public constructor(...args: any[]) {
        if (args.length === 1) {
            super(500, "Internal server error occurred.", args[0]);
        }
        if (args.length === 2) {
            super(500, args[0], args[1]);
        }
    }
}
