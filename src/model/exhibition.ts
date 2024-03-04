import {Entity, EntityItem} from "electrodb";
import {dynamoClient} from "../common/aws-clients";

const table = process.env.RESOURCE_TABLE_NAME!!;

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
            identityId: {
                type: "string",
                required: true,
            },
            institutionId: {
                type: "string",
                required: true,
            },
            referenceName: {
                type: "string",
                required: true,
            },
            qrCode: {
                type: "map",
                required: true,
                properties: {
                    privatePath: {
                        type: "string",
                        required: true,
                    },
                    value: {
                        type: "string",
                        required: true,
                    },
                },
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
                        privatePath: {
                            type: "string",
                            required: true,
                        },
                        publicPath: {
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
                sk: {
                    field: "sk",
                    composite: ["id"],
                },
            },
            byCustomer: {
                index: "gsi1pk-gsi1sk-index",
                pk: {
                    field: "gsi1pk",
                    composite: ["customerId"],
                },
                sk: {
                    field: "gsi1sk",
                    composite: ["id"],
                },
            },
            byInstitution: {
                index: "gsi2pk-gsi2sk-index",
                pk: {
                    field: "gsi2pk",
                    composite: ["institutionId"],
                },
                sk: {
                    field: "gsi2sk",
                    composite: ["id"],
                },
            },
        },
    },
    {client: dynamoClient, table},
);

export type Exhibition = EntityItem<typeof ExhibitionDao>