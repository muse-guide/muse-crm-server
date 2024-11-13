export interface SubscriptionPlanDto {
    type: string,
    price: number,
    maxExhibitions: number,
    maxExhibits: number,
    maxLanguages: number,
}

export interface InvoicePeriodDto {
    periodStart: string,
    periodEnd: string,
}

export interface companyDetailsDto {
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
    }
}

export interface ApplicationConfigurationDto {
    subscriptionPlans: SubscriptionPlanDto[],
    lastInvoicedPeriod: InvoicePeriodDto,
    companyDetails: companyDetailsDto,
}