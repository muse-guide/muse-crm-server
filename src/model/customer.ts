import {Entity, EntityItem} from "electrodb";
import {identityStatus, subscriptionPlanOption, subscriptionStatus} from "./common";
import {dynamoClient} from "../common/aws-clients";

const table = process.env.RESOURCE_TABLE_NAME!!;

export const CustomerDao = new Entity(
    {
        model: {
            entity: "customer",
            version: "1",
            service: "crm",
        },
        attributes: {
            customerId: {
                type: "string",
                required: true,
            },
            email: {
                type: "string",
                required: true,
            },
            status: {
                type: identityStatus,
                required: true,
            },
            fullName: {
                type: "string",
                required: false,
            },
            telephoneNumber: {
                type: "string",
                required: false,
            },
            taxNumber: {
                type: "string",
                required: false,
            },
            address: {
                type: "map",
                required: false,
                properties: {
                    street: {
                        type: "string",
                        required: false,
                    },
                    houseNumber: {
                        type: "string",
                        required: false,
                    },
                    houseNumberExtension: {
                        type: "string",
                        required: false,
                    },
                    city: {
                        type: "string",
                        required: false,
                    },
                    zipCode: {
                        type: "string",
                        required: false,
                    },
                    country: {
                        type: "string",
                        required: false,
                    },
                },
            },
            createdAt: {
                type: "number",
                set: _ => {
                    return Date.now()
                }
            },
            version: {
                type: "number",
                set: _ => {
                    return Date.now()
                }
            },
        },
        indexes: {
            byCustomerId: {
                pk: {
                    field: "pk",
                    composite: ["customerId"],
                    casing: "none",
                },
                sk: {
                    field: "sk",
                    composite: ["customerId"],
                    casing: "none",
                },
            },
            customerWithSubscriptions: {
                index: "gsi1pk-gsi1sk-index",
                collection: "customerWithSubscriptions",
                pk: {
                    field: "gsi1pk",
                    composite: ["customerId"],
                    casing: "none",
                },
                sk: {
                    field: "gsi1sk",
                    composite: ["customerId"],
                    casing: "none",
                },
            },
        },
    },
    {client: dynamoClient, table},
);

export const SubscriptionDao = new Entity(
    {
        model: {
            entity: "subscription",
            version: "1",
            service: "crm",
        },
        attributes: {
            subscriptionId: {
                type: "string",
                required: true,
            },
            customerId: {
                type: "string",
                required: true,
            },
            plan: {
                type: subscriptionPlanOption,
                required: true,
            },
            status: {
                type: subscriptionStatus,
                required: true,
            },
            startedAt: {
                type: "string",
                required: true,
            },
            expiredAt: {
                type: "string",
                required: false,
            },
            tokenCount: {
                type: "number",
                required: true,
            },
            createdAt: {
                type: "number",
                set: _ => {
                    return Date.now()
                }
            },
            version: {
                type: "number",
                set: _ => {
                    return Date.now()
                }
            },
        },
        indexes: {
            bySubscriptionId: {
                pk: {
                    field: "pk",
                    composite: ["subscriptionId"],
                    casing: "none",
                },
                sk: {
                    field: "sk",
                    composite: ["subscriptionId"],
                    casing: "none",
                },
            },
            byCustomerId: {
                index: "gsi1pk-gsi1sk-index",
                collection: "customerWithSubscriptions",
                pk: {
                    field: "gsi1pk",
                    composite: ["customerId"],
                    casing: "none",
                },
                sk: {
                    field: "gsi1sk",
                    composite: ["subscriptionId"],
                    casing: "none",
                },
            },
        },
    },
    {client: dynamoClient, table},
);

export type Customer = EntityItem<typeof CustomerDao>
export type Subscription = EntityItem<typeof SubscriptionDao>

export type CustomerWithSubscription = {
    customer: Customer,
    subscription: Subscription
}

export type CustomerResources = {
    customerId: string,
    institutionsCount: number,
    exhibitionsCount: number,
    exhibitsCount: number,
    maxLanguages: number,
}