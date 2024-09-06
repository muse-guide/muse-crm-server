import {Entity, EntityItem} from "electrodb";
import {invoiceStatus, subscriptionPlanType} from "./common";
import {dynamoClient} from "../common/aws-clients";

const table = process.env.RESOURCE_TABLE_NAME!!;

export const InvoiceDao = new Entity(
    {
        model: {
            entity: "invoice",
            version: "1",
            service: "crm",
        },
        attributes: {
            invoiceId: {
                type: "string",
                required: true,
            },
            invoiceBusinessId: {
                type: "string",
                required: true,
            },
            customerId: {
                type: "string",
                required: true,
            },
            periodStart: {
                type: "string",
                required: true,
            },
            periodEnd: {
                type: "string",
                required: true,
            },
            paymentDue: {
                type: "string",
                required: true,
            },
            amount: {
                type: "string",
                required: true,
            },
            status: {
                type: invoiceStatus,
                required: true,
            },
            issuedAt: {
                type: "string",
                required: true,
            },
            soldAt: {
                type: "string",
                required: true,
            },
            subscriptions: {
                type: "list",
                required: true,
                items: {
                    type: "string",
                    required: true,
                }
            },
            invoiceItems: {
                type: "list",
                required: true,
                items: {
                    type: "map",
                    properties: {
                        plan: {
                            type: subscriptionPlanType,
                            required: true,
                        },
                        activeFrom: {
                            type: "string",
                            required: true,
                        },
                        activeTo: {
                            type: "string",
                            required: true,
                        },
                        amount: {
                            type: "string",
                            required: true,
                        },
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
            byInvoiceId: {
                pk: {
                    field: "pk",
                    composite: ["invoiceId"],
                    casing: "none",
                },
                sk: {
                    field: "sk",
                    composite: ["invoiceId"],
                    casing: "none",
                },
            },
            byCustomerId: {
                index: "gsi1pk-gsi1sk-index",
                pk: {
                    field: "gsi1pk",
                    composite: ["customerId"],
                    casing: "none",
                },
                sk: {
                    field: "gsi1sk",
                    composite: ["invoiceId"],
                    casing: "none",
                },
            },
        },
    },
    {client: dynamoClient, table},
);

export type Invoice = EntityItem<typeof InvoiceDao>

