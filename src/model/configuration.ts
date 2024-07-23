import {SubscriptionPlanType} from "./common";

const envToNumber = (env: string | undefined, defaultValue: number) => {
    if (env === undefined) {
        return defaultValue;
    }
    return parseInt(env);
}

const subscriptionPlans: SubscriptionPlan[] = [
    {
        name: "FREE",
        price: envToNumber(process.env.SUB_FREE_PRICE, 0),
        maxExhibitions: envToNumber(process.env.SUB_FREE_MAX_EXHIBITIONS, 1),
        maxExhibits: envToNumber(process.env.SUB_FREE_MAX_EXHIBITS, 10),
        maxLanguages: envToNumber(process.env.SUB_FREE_MAX_LANGUAGES, 1),
    },
    {
        name: "BASIC",
        price: envToNumber(process.env.SUB_BASIC_PRICE, 5),
        maxExhibitions: envToNumber(process.env.SUB_BASIC_MAX_EXHIBITIONS, 2),
        maxExhibits: envToNumber(process.env.SUB_BASIC_MAX_EXHIBITS, 20),
        maxLanguages: envToNumber(process.env.SUB_BASIC_MAX_LANGUAGES, 2),
    },
    {
        name: "PREMIUM",
        price: envToNumber(process.env.SUB_PREMIUM_PRICE, 10),
        maxExhibitions: envToNumber(process.env.SUB_PREMIUM_MAX_EXHIBITIONS, 5),
        maxExhibits: envToNumber(process.env.SUB_PREMIUM_MAX_EXHIBITS, 100),
        maxLanguages: envToNumber(process.env.SUB_PREMIUM_MAX_LANGUAGES, 5),
    }
];

export interface SubscriptionPlan {
    name: SubscriptionPlanType,
    price: number,
    maxExhibitions: number,
    maxExhibits: number,
    maxLanguages: number,
}

export interface ApplicationConfiguration {
    subscriptionPlans: SubscriptionPlan[]
}

export const configuration: ApplicationConfiguration = {
    subscriptionPlans: subscriptionPlans,
};