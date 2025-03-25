import {SubscriptionPeriod, SubscriptionPlanType} from "./common";

const envToNumber = (env: string | undefined, defaultValue: number) => {
    if (env === undefined) {
        return defaultValue;
    }
    return parseInt(env);
}

const subscriptionPlans: SubscriptionPlan[] = [
    {
        name: "FREE",
        durationMonths: undefined,
        price: envToNumber(process.env.SUB_FREE_PRICE, 0),
        maxExhibitions: envToNumber(process.env.SUB_FREE_MAX_EXHIBITIONS, 1),
        maxExhibits: envToNumber(process.env.SUB_FREE_MAX_EXHIBITS, 10),
        maxLanguages: envToNumber(process.env.SUB_FREE_MAX_LANGUAGES, 1),
        tokenCount: envToNumber(process.env.SUB_FREE_TOKEN_COUNT, 5000),

    },
    {
        name: "BASIC",
        durationMonths: 1,
        price: envToNumber(process.env.SUB_BASIC_PRICE, 5),
        maxExhibitions: envToNumber(process.env.SUB_BASIC_MAX_EXHIBITIONS, 2),
        maxExhibits: envToNumber(process.env.SUB_BASIC_MAX_EXHIBITS, 20),
        maxLanguages: envToNumber(process.env.SUB_BASIC_MAX_LANGUAGES, 2),
        tokenCount: envToNumber(process.env.SUB_BASIC_TOKEN_COUNT, 10000),
    },
    {
        name: "PREMIUM",
        durationMonths: 1,
        price: envToNumber(process.env.SUB_PREMIUM_PRICE, 10),
        maxExhibitions: envToNumber(process.env.SUB_PREMIUM_MAX_EXHIBITIONS, 5),
        maxExhibits: envToNumber(process.env.SUB_PREMIUM_MAX_EXHIBITS, 100),
        maxLanguages: envToNumber(process.env.SUB_PREMIUM_MAX_LANGUAGES, 5),
        tokenCount: envToNumber(process.env.SUB_PREMIUM_TOKEN_COUNT, 20000),
    }
];

export interface SubscriptionPlan {
    name: SubscriptionPlanType,
    durationMonths?: number,
    price: number,
    maxExhibitions: number,
    maxExhibits: number,
    maxLanguages: number,
    tokenCount: number
}

export interface CompanyDetails {
    name: string,
    taxNumber: string,
    bankAccount: string,
    address: {
        street: string,
        houseNumber: string,
        houseNumberExtension: string
        city: string,
        zipCode: string,
        country: string,
    },
}

export const companyDetails: CompanyDetails = {
    name: "muse.cloud Ltd.",
    taxNumber: "8393035205",
    bankAccount: "PL 00 0000 0000 0000 0000 0000 0000",
    address: {
        street: "Wita Stwosza",
        houseNumber: "13",
        houseNumberExtension: "15",
        city: "Gdańsk",
        zipCode: "90-312",
        country: "Polska",
    }
}

export interface ApplicationConfiguration {
    subscriptionPlans: SubscriptionPlan[],
    companyDetails: CompanyDetails,
}

export const configuration: ApplicationConfiguration = {
    subscriptionPlans: subscriptionPlans,
    companyDetails: companyDetails,
};