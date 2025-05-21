import {logger} from "./logger";
import {customerService} from "../service/customer";

export const unlockSubscription = async (customerId: string, error: any) => {
    logger.error("Exception occurred during resource mutation: ", error)
    const customerWithSubscription = await customerService.getCustomerWithSubscription(customerId)
    if (customerWithSubscription) {
        await customerService.unlockSubscription(customerWithSubscription.subscription.subscriptionId)
    }
}