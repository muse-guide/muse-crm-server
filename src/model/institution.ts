import {Entity, EntityItem} from "electrodb";
import {dynamoClient} from "../common/aws-clients";
import {resourceStatus, supportedLanguages, supportedVoices} from "./common";

const table = process.env.RESOURCE_TABLE_NAME!!;

export const InstitutionDao = new Entity(
    {
        model: {
            entity: "institution",
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
            referenceName: {
                type: "string",
                required: false,
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
                            required: false,
                        },
                        article: {
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
                type: resourceStatus,
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
            byCustomer: {
                index: "gsi1pk-gsi1sk-index",
                collection: "customerResources",
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

export type Institution = EntityItem<typeof InstitutionDao>

export interface InstitutionPreview {
    id: string;
    lang: string;
    langOptions: string[];
    title: string;
    subtitle?: string;
    article?: string;
    imageUrls: string[];
    audio?: string;
}