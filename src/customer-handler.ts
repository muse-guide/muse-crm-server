import middy from "@middy/core";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import {APIGatewayProxyEvent, APIGatewayProxyResult, PostConfirmationTriggerEvent} from "aws-lambda";
import {customerService} from "./service/customer";
import {logger} from "./common/logger";
import {uuidId} from "./schema/validation";
import {responseFormatter, restHandleError} from "./common/response-formatter";
import cors from "@middy/http-cors";
import {updateSubscriptionSchema} from "./schema/customer";
import {configurationService} from "./service/configuration";

const customerCreate = async (event: PostConfirmationTriggerEvent) => {
    const {userAttributes} = event.request
    const customerId = userAttributes['sub']
    const email = userAttributes['email']

    logger.info(`Creating customer with id: ${customerId} and email: ${email}`)
    await customerService.createCustomer(customerId, email)

    return event
};

export const customerCreateHandler = middy(customerCreate);
customerCreateHandler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))


const customerGet = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)

        logger.info(`Getting customer with id: ${customerId}`)
        const customer = await customerService.getCustomerDetails(customerId)
        return responseFormatter(200, customer)
    } catch (err) {
        return restHandleError(err);
    }
}

export const customerGetHandler = middy(customerGet);
customerGetHandler
    .use(cors())


const subscriptionUpdate = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const request = updateSubscriptionSchema.parse(event.body)
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)

        logger.info(`Changing subscription for customer with id: ${customerId}. New plan: ${request.newPlan}`)
        const response = await customerService.changeSubscription(customerId, request.newPlan)
        return responseFormatter(200, response)
    } catch (err) {
        return restHandleError(err);
    }
}

export const subscriptionUpdateHandler = middy(subscriptionUpdate);
subscriptionUpdateHandler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))