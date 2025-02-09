import {handleError, responseFormatter, restHandleError} from "./common/response-formatter";
import middy from "@middy/core";
import httpJsonBodyParser from '@middy/http-json-body-parser'
import {logger} from "./common/logger";
import {InvoiceFilters, invoiceService} from "./service/invoice";
import {configurationService} from "./service/configuration";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {nanoId_12, uuidId} from "./schema/validation";
import cors from "@middy/http-cors";
import {z} from "zod";
import {InvoiceDetailsDto, InvoiceDto, invoicePaymentStatus} from "./schema/invoice";
import {Invoice} from "./model/invoice";
import {PaginatedDtoResults} from "./schema/common";


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
            paymentStatus: z.enum(invoicePaymentStatus).parse(event.queryStringParameters?.["paymentStatus"]),
        }

        const pagination = {
            pageSize: z.coerce.number().optional().parse(event.queryStringParameters?.["page-size"]) ?? 10,
            nextPageKey: event.queryStringParameters?.["next-page-key"]
        }

        const invoicesPaginated = await invoiceService.getInvoicesForCustomer(customerId, pagination, filters)
        const response: PaginatedDtoResults = {
            ...invoicesPaginated,
            items: invoicesPaginated.items.map(invoice => mapToInvoiceDto(invoice))
        }

        return responseFormatter(200, response)
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
        const invoiceDetailsDto = mapToInvoiceDetailsDto(invoiceDetails)

        return responseFormatter(200, invoiceDetailsDto)
    } catch (err) {
        return restHandleError(err);
    }
};

export const invoiceGetHandler = middy(invoiceGet);
invoiceGetHandler
    .use(cors())


const mapToInvoiceDto = (invoice: Invoice): InvoiceDto => {
    return {
        invoiceId: invoice.invoiceId,
        invoiceBusinessId: invoice.invoiceBusinessId,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        paymentDue: invoice.paymentDue,
        amount: invoice.amount,
        status: invoice.status
    }
}

const mapToInvoiceDetailsDto = (invoice: Invoice): InvoiceDetailsDto => {
    return {
        ...mapToInvoiceDto(invoice),
        issuedAt: invoice.issuedAt,
        soldAt: invoice.soldAt,
        invoiceItems: invoice.invoiceItems.map(item => ({
            plan: item.plan,
            activeFrom: item.activeFrom,
            activeTo: item.activeTo,
            amount: item.amount
        }))
    }
}
