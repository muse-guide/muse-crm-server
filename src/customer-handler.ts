import middy from "@middy/core";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import {APIGatewayProxyEvent, APIGatewayProxyResult, PostConfirmationTriggerEvent} from "aws-lambda";
import {customerService} from "./service/customer";
import {logger} from "./common/logger";
import {uuidId} from "./schema/validation";
import {responseFormatter, restHandleError} from "./common/response-formatter";
import cors from "@middy/http-cors";
import {CustomerDto, updateCustomerDetailsSchema, updateSubscriptionSchema} from "./schema/customer";
import {CustomerWithSubscription} from "./model/customer";

const customerCreate = async (event: PostConfirmationTriggerEvent) => {
    const {userAttributes} = event.request
    const customerId = userAttributes['sub']
    const email = userAttributes['email']

    logger.info(`Creating customer with id: ${customerId} and email: ${email}`)
    await customerService.createNewCustomer(customerId, email)

    return event
};

export const customerCreateHandler = middy(customerCreate);
customerCreateHandler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))


const customerGet = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        logger.info(`Getting customer details`, event.requestContext.authorizer?.claims.sub)
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)

        logger.info(`Getting customer with id: ${customerId}`)
        const customer = await customerService.getCustomerWithSubscription(customerId)
        const customerDto = mapToCustomerDto(customer)

        return responseFormatter(200, customerDto)
    } catch (err) {
        return restHandleError(err);
    }
}

export const customerGetHandler = middy(customerGet);
customerGetHandler
    .use(cors())


const customerDetailsUpdate = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const request = updateCustomerDetailsSchema.parse(event.body)
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)

        logger.info(`Updating details of customer with id: ${customerId}`)
        const customer = await customerService.updateCustomerDetails(customerId, request)
        const customerDto = mapToCustomerDto(customer)

        return responseFormatter(200, customerDto)
    } catch (err) {
        return restHandleError(err);
    }
}

export const customerDetailsUpdateHandler = middy(customerDetailsUpdate);
customerDetailsUpdateHandler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))


const subscriptionUpdate = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const request = updateSubscriptionSchema.parse(event.body)
        const customerId = uuidId.parse(event.requestContext.authorizer?.claims.sub)

        logger.info(`Changing subscription for customer with id: ${customerId}. New plan: ${request.newPlan}`)
        const customer = await customerService.changeSubscription(customerId, request.newPlan)
        const customerDto = mapToCustomerDto(customer)

        return responseFormatter(200, customerDto)
    } catch (err) {
        return restHandleError(err);
    }
}

export const subscriptionUpdateHandler = middy(subscriptionUpdate);
subscriptionUpdateHandler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))

const mapToCustomerDto = (customer: CustomerWithSubscription): CustomerDto => {
    return {
        customerId: customer.customer.customerId,
        email: customer.customer.email,
        status: customer.customer.status,
        fullName: customer.customer.fullName,
        taxNumber: customer.customer.taxNumber,
        telephoneNumber: customer.customer.telephoneNumber,
        subscription: {
            subscriptionId: customer.subscription.subscriptionId,
            plan: customer.subscription.plan,
            status: customer.subscription.status,
            startedAt: customer.subscription.startedAt,
            expiredAt: customer.subscription.expiredAt,
            tokenCount: customer.subscription.tokenCount,
        },
        address: customer.customer.address
    }
}