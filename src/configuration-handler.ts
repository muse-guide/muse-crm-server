import middy from "@middy/core";
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {logger} from "./common/logger";
import {responseFormatter, restHandleError} from "./common/response-formatter";
import cors from "@middy/http-cors";
import {configurationService} from "./service/configuration";
import {ApplicationConfiguration} from "./model/configuration";

const configurationGet = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        logger.info(`Getting application configuration`)
        const applicationConfiguration = configurationService.getApplicationConfiguration()

        return responseFormatter(200, mapToConfigurationDto(applicationConfiguration))
    } catch (err) {
        return restHandleError(err);
    }
}

export const configurationGetHandler = middy(configurationGet);
configurationGetHandler
    .use(cors())

const mapToConfigurationDto = (configuration: ApplicationConfiguration) => {
    return {
        subscriptionPlans: configuration.subscriptionPlans.map(plan => {
            return {
                type: plan.name,
                price: plan.price,
                maxExhibitions: plan.maxExhibitions,
                maxExhibits: plan.maxExhibits,
                maxLanguages: plan.maxLanguages,
                tokenCount: plan.tokenCount,
            }
        }),
        companyDetails: configuration.companyDetails
    }
}