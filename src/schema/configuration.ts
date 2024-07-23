export interface SubscriptionPlanDto {
    type: string,
    price: number,
    maxExhibitions: number,
    maxExhibits: number,
    maxLanguages: number,
}

export interface ApplicationConfigurationDto {
    subscriptionPlans: SubscriptionPlanDto[]
}