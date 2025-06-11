import {SubscriptionPlanOption} from "./common";

const envToNumber = (env: string | undefined, defaultValue: number) => {
    if (env === undefined) {
        return defaultValue;
    }
    return parseInt(env);
}

const subscriptionPlans: SubscriptionPlan[] = [
    {
        type: "FREE",
        name: "FREE",
        durationMonths: undefined,
        price: 0,
        maxExhibitions: 1,
        maxExhibits: 5,
        maxLanguages: 1,
        tokenCount: 25_000,
    },
    {
        type: "BASIC_MONTHLY",
        name: "BASIC",
        durationMonths: 1,
        price: 19,
        maxExhibitions: 2,
        maxExhibits: 25,
        maxLanguages: 3,
        tokenCount: 450_000,
    },
    {
        type: "STANDARD_MONTHLY",
        name: "STANDARD",
        durationMonths: 1,
        price: 35,
        maxExhibitions: 5,
        maxExhibits: 50,
        maxLanguages: 5,
        tokenCount: 900_000,
    },
    {
        type: "PREMIUM_MONTHLY",
        name: "PREMIUM",
        durationMonths: 1,
        price: 69,
        maxExhibitions: 10,
        maxExhibits: 100,
        maxLanguages: 5,
        tokenCount: 1_800_000,
    },
    {
        type: "BASIC_YEARLY",
        name: "BASIC",
        durationMonths: 12,
        price: 139,
        maxExhibitions: 2,
        maxExhibits: 25,
        maxLanguages: 3,
        tokenCount: 2_700_000,
    },
    {
        type: "STANDARD_YEARLY",
        name: "STANDARD",
        durationMonths: 12,
        price: 245,
        maxExhibitions: 5,
        maxExhibits: 50,
        maxLanguages: 5,
        tokenCount: 5_400_000,
    },
    {
        type: "PREMIUM_YEARLY",
        name: "PREMIUM",
        durationMonths: 12,
        price: 489,
        maxExhibitions: 10,
        maxExhibits: 100,
        maxLanguages: 5,
        tokenCount: 10_800_000,
    },
];

export interface SubscriptionPlan {
    type: SubscriptionPlanOption,
    name: string,
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