import middy from "@middy/core";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {logger} from "./common/logger";
import {responseFormatter, restHandleError} from "./common/response-formatter";
import cors from "@middy/http-cors";
import {configurationService} from "./service/configuration";
import {ApplicationConfiguration, InvoicePeriod} from "./model/configuration";

const configurationGet = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        logger.info(`Getting application configuration`)
        const lastInvoicedPeriod = configurationService.getCurrentInvoicePeriod()
        const applicationConfiguration = configurationService.getApplicationConfiguration()

        return responseFormatter(200, mapToConfigurationDto(applicationConfiguration, lastInvoicedPeriod))
    } catch (err) {
        return restHandleError(err);
    }
}

export const configurationGetHandler = middy(configurationGet);
configurationGetHandler
    .use(cors())

const mapToConfigurationDto = (configuration: ApplicationConfiguration, lastInvoicedPeriod: InvoicePeriod) => {
    return {
        subscriptionPlans: configuration.subscriptionPlans.map(plan => {
            return {
                type: plan.name,
                price: plan.price,
                maxExhibitions: plan.maxExhibitions,
                maxExhibits: plan.maxExhibits,
                maxLanguages: plan.maxLanguages,
            }
        }),
        lastInvoicedPeriod: {
            periodStart: lastInvoicedPeriod.periodStart,
            periodEnd: lastInvoicedPeriod.periodEnd,
        },
        companyDetails: configuration.companyDetails
    }
}