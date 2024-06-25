import {Entity, EntityItem} from "electrodb";
import {identityStatus, subscriptionType, subscriptionStatus} from "./common";
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
            id: {
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
            byId: {
                pk: {
                    field: "pk",
                    composite: ["id"],
                    casing: "none",
                },
                sk: {
                    field: "sk",
                    composite: ["id"],
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
            id: {
                type: "string",
                required: true,
            },
            customerId: {
                type: "string",
                required: true,
            },
            plan: {
                type: subscriptionType,
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
            expiresAt: {
                type: "string",
                required: false,
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
            byId: {
                pk: {
                    field: "pk",
                    composite: ["id"],
                    casing: "none",
                },
                sk: {
                    field: "sk",
                    composite: ["id"],
                    casing: "none",
                },
            },
            byCustomer: {
                index: "gsi1pk-gsi1sk-index",
                pk: {
                    field: "gsi1pk",
                    composite: ["customerId"],
                    casing: "none",
                },
                sk: {
                    field: "gsi1sk",
                    composite: ["id"],
                    casing: "none",
                },
            },
        },
    },
    {client: dynamoClient, table},
);

export type Customer = EntityItem<typeof CustomerDao>
export type Subscription = EntityItem<typeof SubscriptionDao>