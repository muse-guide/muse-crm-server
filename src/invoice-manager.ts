import {handleError, responseFormatter, restHandleError} from "./common/response-formatter";
import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {logger} from "./common/logger";
import {InvoiceFilters, invoiceService} from "./service/invoice";
import {configurationService} from "./service/configuration";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {nanoId, nanoId_12, required, uuidId} from "./schema/validation";
import cors from "@middy/http-cors";
import {z} from "zod";
import {configuration} from "./model/configuration";


const issueInvoices = async (event: any) => {
    try {
        const invoicePeriod = configurationService.getCurrentInvoicePeriod();
        logger.info(`Collecting active subscriptions for invoice period ${invoicePeriod.periodStart} - ${invoicePeriod.periodEnd}`);

        const invoices = await invoiceService.createInvoices(invoicePeriod);
        logger.info(JSON.stringify(invoices));

    } catch (err) {
        return handleError(err);
    }
};

export const handler = middy(issueInvoices);
handler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))


const invoicesGet = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)

        const filters: InvoiceFilters = {
            periodFrom: required.parse(event.queryStringParameters?.["from"]),
            periodTo: required.parse(event.queryStringParameters?.["to"])
        }

        const paginatedResults = await invoiceService.getInvoicesForCustomer(customerId, filters)
        return responseFormatter(200, paginatedResults)
    } catch (err) {
        return restHandleError(err);
    }
};

export const invoicesGetHandler = middy(invoicesGet);
invoicesGetHandler
    .use(cors())


const invoiceGet = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)
        const invoiceId = nanoId_12.parse(event.pathParameters?.["id"])

        const invoiceDetails = await invoiceService.getInvoiceForCustomer(customerId, invoiceId)
        return responseFormatter(200, invoiceDetails)
    } catch (err) {
        return restHandleError(err);
    }
};

export const invoiceGetHandler = middy(invoiceGet);
invoiceGetHandler
    .use(cors())