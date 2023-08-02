import {Response} from "express";
import {BaseException, InternalServerErrorException} from "./exceptions";

export const handleResponse = (body: object, res: Response, statusCode?: number,) => {
    res.status(statusCode ?? 200)
        .json(body)
        .setHeader("Content-Type", "application/json")
        .setHeader("Access-Control-Allow-Origin", "*")
        .setHeader("Access-Control-Allow-Headers", "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent")
        .setHeader("Access-Control-Allow-Methods", "OPTIONS,GET,PUT,POST,DELETE")
};

export const handleError = (err: unknown, res: Response) => {
    console.error("Error:", err);
    let errorResponse: BaseException = new InternalServerErrorException(err);
    if (err instanceof BaseException) errorResponse = err;

    res.status(errorResponse.statusCode)
        .json(errorResponse.message)
        .setHeader("Content-Type", "application/json")
}