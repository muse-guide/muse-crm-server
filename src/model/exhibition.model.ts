import DynamoDB from "aws-sdk/clients/dynamodb";
import {Entity, EntityItem} from "electrodb";

const client = new DynamoDB.DocumentClient();
const table = process.env.EXHIBITION_TABLE_NAME!!;

export const ExhibitionDao = new Entity(
    {
        model: {
            entity: "exhibition",
            version: "1",
            service: "muse",
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
            customerIdSortKey: {
                type: "string",
                watch: ["id"],
                set: (_, {id}) => {
                    return id
                },
            },
            institutionId: {
                type: "string",
                required: true,
            },
            referenceName: {
                type: "string",
                required: true,
            },
            qrCodeUrl: {
                type: "string",
                required: true,
            },
            includeInstitutionInfo: {
                type: "boolean",
                required: true,
            },
            langOptions: {
                type: "list",
                required: true,
                items: {
                    type: "map",
                    properties: {
                        lang: {
                            type: "string",
                            required: true,
                        },
                        title: {
                            type: "string",
                            required: true,
                        },
                        subtitle: {
                            type: "string",
                            required: true,
                        },
                        description: {
                            type: "string",
                            required: false,
                        },
                    },
                },
            },
            images: {
                type: "list",
                required: true,
                items: {
                    type: "map",
                    properties: {
                        key: {
                            type: "string",
                            required: true,
                        },
                        name: {
                            type: "string",
                            required: true,
                        },
                    },
                },
            },
            status: {
                type: ["ACTIVE", "ERROR"] as const,
                required: true,
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
                },
            },
            byCustomerId: {
                index: "gsi1pk-gsi1sk-index",
                pk: {
                    field: "gsi1pk",
                    composite: ["customerId"],
                },
                sk: {
                    field: "gsi1sk",
                    composite: ["customerIdSortKey"],
                },
            },
        },
    },
    {client, table},
);

export type Exhibition = EntityItem<typeof ExhibitionDao>