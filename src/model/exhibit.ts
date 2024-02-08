import {Entity, EntityItem} from "electrodb";
import {client} from "../common/dbclient";

const table = process.env.EXHIBITION_TABLE_NAME!!;

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
            exhibitionId: {
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
                    url: {
                        type: "string",
                        required: true,
                    },
                    value: {
                        type: "string",
                        required: true,
                    },
                }
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
                        audio: {
                            type: "map",
                            required: false,
                            properties: {
                                markup: {
                                    type: "string",
                                    required: true,
                                },
                                url: {
                                    type: "string",
                                    required: true,
                                }
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
            byExhibition: {
                index: "gsi2pk-gsi2sk-index",
                pk: {
                    field: "gsi2pk",
                    composite: ["exhibitionId"],
                },
                sk: {
                    field: "gsi2sk",
                    composite: ["id"],
                },
            },
        },
    },
    {client, table},
);

export type Exhibit = EntityItem<typeof ExhibitDao>