import {configuration, InvoicePeriod, SubscriptionPlan} from "../model/configuration";
import {ApplicationConfigurationDto} from "../schema/configuration";
import {ConfigurationException} from "../common/exceptions";
import {SubscriptionPlanType} from "../model/common";
import {getDateString} from "./common";

const getSubscriptionPlan = (name: SubscriptionPlanType): SubscriptionPlan => {
    const plan = configuration.subscriptionPlans.find(plan => plan.name === name);
    if (plan === undefined) {
        throw new ConfigurationException(`Invalid subscription plan name: ${name}`);
    }
    return plan;
}

const getLastInvoicedPeriod = (): InvoicePeriod => {
    const now = getDateString(new Date())

    let currentPeriod: InvoicePeriod | undefined
    configuration.invoicePeriods.forEach((period, index) => {
        if (now >= period.periodStart && now <= period.periodEnd) {
            currentPeriod = configuration.invoicePeriods[index - 1]
        }
    })

    if (!currentPeriod) {
        throw new ConfigurationException("No current invoice period found")
    }

    return currentPeriod
}

const getApplicationConfiguration = (): ApplicationConfigurationDto => {
    const lastInvoicedPeriod = getLastInvoicedPeriod()
    return {
        subscriptionPlans: configuration.subscriptionPlans.map(plan => {
            return {
                type: plan.name,
                price: plan.price,
                maxExhibitions: plan.maxExhibitions,
                maxExhibits: plan.maxExhibits,
                maxLanguages: plan.maxLanguages,
            }
        }),
        lastInvoicedPeriod: {
            periodStart: lastInvoicedPeriod.periodStart,
            periodEnd: lastInvoicedPeriod.periodEnd,
        },
        companyDetails: configuration.companyDetails
    }
}

export const configurationService = {
    getApplicationConfiguration: getApplicationConfiguration,
    getCurrentInvoicePeriod: getLastInvoicedPeriod,
    getSubscriptionPlan: getSubscriptionPlan,
};