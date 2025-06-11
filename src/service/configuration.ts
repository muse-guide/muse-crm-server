import {ApplicationConfiguration, configuration, SubscriptionPlan} from "../model/configuration";
import {ConfigurationException} from "../common/exceptions";
import {SubscriptionPlanOption} from "../model/common";

const getSubscriptionPlan = (name: SubscriptionPlanOption): SubscriptionPlan => {
    const plan = configuration.subscriptionPlans.find(plan => plan.type === name);
    if (plan === undefined) {
        throw new ConfigurationException(`apiError.configurationInvalidPlanName`);
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