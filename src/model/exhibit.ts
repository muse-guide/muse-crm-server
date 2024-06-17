import {Entity, EntityItem} from "electrodb";
import {dynamoClient} from "../common/aws-clients";
import {status, supportedLanguages, supportedVoices} from "./common";

const table = process.env.RESOURCE_TABLE_NAME!!;

export const ExhibitDao = new Entity(
    {
        model: {
            entity: "exhibit",
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
            exhibitionId: {
                type: "string",
                required: true,
            },
            referenceName: {
                type: "string",
                required: true,
            },
            number: {
                type: "string",
                required: true,
            },
            langOptions: {
                type: "list",
                required: true,
                items: {
                    type: "map",
                    properties: {
                        lang: {
                            type: supportedLanguages,
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
                        audio: {
                            type: "map",
                            required: false,
                            properties: {
                                markup: {
                                    type: "string",
                                    required: true,
                                },
                                voice: {
                                    type: supportedVoices,
                                    required: true,
                                },
                            }
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
                        id: {
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
                type: status,
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
                    composite: ["exhibitionId", "number"],
                    casing: "none",
                },
            },
            byExhibition: {
                index: "gsi2pk-gsi2sk-index",
                pk: {
                    field: "gsi2pk",
                    composite: ["exhibitionId"],
                    casing: "none",
                },
                sk: {
                    field: "gsi2sk",
                    composite: ["number"],
                    casing: "none",
                },
            },
        },
    },
    {client: dynamoClient, table},
);

export type Exhibit = EntityItem<typeof ExhibitDao>