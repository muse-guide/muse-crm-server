import middy from "@middy/core";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import {PostConfirmationTriggerEvent} from "aws-lambda";
import {customerService} from "./service/customer";

const customerCreate = async (event: PostConfirmationTriggerEvent) => {
    const {userAttributes} = event.request
    const customerId = userAttributes['sub']
    const email = userAttributes['email']

    await customerService.createCustomer(customerId, email)
    return event
};

export const customerCreateHandler = middy(customerCreate);
customerCreateHandler
    .use(httpJsonBodyParser({
        disableContentTypeError: true
    }))