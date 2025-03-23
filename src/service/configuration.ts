import {ApplicationConfiguration, configuration, SubscriptionPlan} from "../model/configuration";
import {ConfigurationException} from "../common/exceptions";
import {SubscriptionPlanType} from "../model/common";

const getSubscriptionPlan = (name: SubscriptionPlanType): SubscriptionPlan => {
    const plan = configuration.subscriptionPlans.find(plan => plan.name === name);
    if (plan === undefined) {
        throw new ConfigurationException(`Invalid subscription plan name: ${name}`);
    }
    return plan;
}

const getApplicationConfiguration = (): ApplicationConfiguration => {
    return configuration
}

export const configurationService = {
    getApplicationConfiguration: getApplicationConfiguration,
    getSubscriptionPlan: getSubscriptionPlan,
};