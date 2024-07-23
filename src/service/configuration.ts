
import {configuration, SubscriptionPlan} from "../model/configuration";
import {ApplicationConfigurationDto} from "../schema/configuration";
import {ConfigurationException} from "../common/exceptions";
import {SubscriptionPlanType} from "../model/common";

const getSubscriptionPlan = (name: SubscriptionPlanType): SubscriptionPlan => {
    const plan = configuration.subscriptionPlans.find(plan => plan.name === name);
    if (plan === undefined) {
        throw new ConfigurationException(`Invalid subscription plan name: ${name}`);
    }
    return plan;
}

const getApplicationConfiguration = (): ApplicationConfigurationDto => {
    return {
        subscriptionPlans: configuration.subscriptionPlans.map(plan => {
            return {
                type: plan.name,
                price: plan.price,
                maxExhibitions: plan.maxExhibitions,
                maxExhibits: plan.maxExhibits,
                maxLanguages: plan.maxLanguages,
            }
        })
    }
}

export const configurationService = {
    getApplicationConfiguration: getApplicationConfiguration,
    getSubscriptionPlan: getSubscriptionPlan,
};