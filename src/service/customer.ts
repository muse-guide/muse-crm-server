import {CustomerDao, SubscriptionDao} from "../model/customer";
import {nanoid_8} from "../model/common";
import {getCurrentDate} from "./common";

// Creates new Customer with Basic subscription
const createCustomer = async (customerId: string, email: string) => {
    const customer = await CustomerDao
        .create({
            id: customerId,
            email: email,
            status: 'ACTIVE',
        })
        .go()

    const subscription = await SubscriptionDao
        .create({
            id: nanoid_8(),
            customerId: customerId,
            plan: "FREE",
            status: 'ACTIVE',
            startedAt: getCurrentDate(),
            expiresAt: undefined,
            version: Date.now(),
        })
        .go()

    return customer
}

export const customerService = {
    createCustomer: createCustomer,
};