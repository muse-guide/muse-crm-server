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

export interface InvoicePeriod {
    periodStart: string,
    periodEnd: string,
    paymentDue: string,
    invoicePrefix: string
}

export const invoicePeriods: InvoicePeriod[] = [
    {periodStart: "2024-12-01", periodEnd: "2024-12-31", paymentDue: "2025-01-15", invoicePrefix: "INV-2024-12"},
    {periodStart: "2025-01-01", periodEnd: "2025-01-31", paymentDue: "2025-02-15", invoicePrefix: "INV-2025-01"},
    {periodStart: "2025-02-01", periodEnd: "2025-02-28", paymentDue: "2025-03-15", invoicePrefix: "INV-2025-02"},
    {periodStart: "2025-03-01", periodEnd: "2025-03-31", paymentDue: "2025-04-15", invoicePrefix: "INV-2025-03"},
    {periodStart: "2025-04-01", periodEnd: "2025-04-30", paymentDue: "2025-05-15", invoicePrefix: "INV-2025-04"},
    {periodStart: "2025-05-01", periodEnd: "2025-05-31", paymentDue: "2025-06-15", invoicePrefix: "INV-2025-05"},
    {periodStart: "2025-06-01", periodEnd: "2025-06-30", paymentDue: "2025-07-15", invoicePrefix: "INV-2025-06"},
    {periodStart: "2025-07-01", periodEnd: "2025-07-31", paymentDue: "2025-08-15", invoicePrefix: "INV-2025-07"},
    {periodStart: "2025-08-01", periodEnd: "2025-08-31", paymentDue: "2025-09-15", invoicePrefix: "INV-2025-08"},
    {periodStart: "2025-09-01", periodEnd: "2025-09-30", paymentDue: "2025-10-15", invoicePrefix: "INV-2025-09"},
    {periodStart: "2025-10-01", periodEnd: "2025-10-31", paymentDue: "2025-11-15", invoicePrefix: "INV-2025-10"},
]

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
    invoicePeriods: InvoicePeriod[],
    companyDetails: CompanyDetails,
}

export const configuration: ApplicationConfiguration = {
    subscriptionPlans: subscriptionPlans,
    invoicePeriods: invoicePeriods,
    companyDetails: companyDetails,
};