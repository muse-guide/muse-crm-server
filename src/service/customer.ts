import {CustomerDao, CustomerResources, CustomerWithSubscription, CustomerWithSubscriptions, Subscription, SubscriptionDao} from "../model/customer";
import {SubscriptionPlanType} from "../model/common";
import {Exposable, getCurrentDate, isExhibit, isExhibition} from "./common";
import {CustomerDto, UpdateCustomerDetailsDto} from "../schema/customer";
import {Service} from "electrodb";
import {CustomerException} from "../common/exceptions";
import {ExhibitDao} from "../model/exhibit";
import {nanoid} from "nanoid";
import {ExhibitionDao} from "../model/exhibition";
import {configurationService} from "./configuration";

// Creates new Customer with Basic subscription
const createCustomer = async (customerId: string, email: string): Promise<CustomerDto> => {
    const customerResponseItem = await CustomerDao
        .create({
            customerId: customerId,
            email: email,
            status: 'ACTIVE',
        })
        .go()

    const subscriptionResponseItem = await SubscriptionDao
        .create({
            subscriptionId: nanoid(),
            customerId: customerId,
            plan: "FREE",
            status: 'ACTIVE',
            startedAt: getCurrentDate(),
            expiredAt: undefined,
            version: Date.now(),
        })
        .go()

    const customer = customerResponseItem.data
    const subscription = subscriptionResponseItem.data

    return mapToCustomerDto({
        customer: customer,
        subscription: subscription
    })
}

const getCustomerDetails = async (customerId: string): Promise<CustomerDto> => {
    const customer = await getCustomerWithActiveSubscription(customerId)
    return mapToCustomerDto(customer)
}

const updateCustomerDetails = async (customerId: string, updateCustomerDetails: UpdateCustomerDetailsDto): Promise<CustomerDto> => {
    const customerResponseItem = await CustomerDao
        .patch({
            customerId: customerId,
        })
        .set({
            fullName: updateCustomerDetails.fullName,
            taxNumber: updateCustomerDetails.taxNumber,
            telephoneNumber: updateCustomerDetails.telephoneNumber,
            address: updateCustomerDetails.address,
        })
        .go({
            response: "all_new"
        })

    return getCustomerDetails(customerId)
}

const changeSubscription = async (customerId: string, newPlan: SubscriptionPlanType): Promise<CustomerDto> => {
    const {customer, subscriptions} = await getCustomerWithSubscriptions(customerId)
    const activeSubscription = getActiveSubscriptionFor(customerId, subscriptions)

    await validateIfCanChangeSubscription(customerId, activeSubscription.plan, newPlan)

    const updatedSubscriptionPromise = SubscriptionDao
        .patch({
            subscriptionId: activeSubscription.subscriptionId,
        })
        .set({
            status: "DEACTIVATED",
            version: Date.now(),
            expiredAt: getCurrentDate(),
        })
        .go({
            response: "all_new"
        })

    const createSubscriptionPromise = SubscriptionDao
        .create({
            subscriptionId: nanoid(),
            customerId: customerId,
            plan: newPlan,
            status: 'ACTIVE',
            startedAt: getCurrentDate(),
            expiredAt: undefined,
            version: Date.now(),
        })
        .go()

    const [_, createSubscriptionResponseItem] = await Promise.all([
        updatedSubscriptionPromise,
        createSubscriptionPromise
    ])

    return mapToCustomerDto({
        customer: customer,
        subscription: createSubscriptionResponseItem.data
    })
}

const mapToCustomerDto = (customer: CustomerWithSubscription): CustomerDto => {
    return {
        customerId: customer.customer.customerId,
        email: customer.customer.email,
        status: customer.customer.status,
        fullName: customer.customer.fullName,
        taxNumber: customer.customer.taxNumber,
        telephoneNumber: customer.customer.telephoneNumber,
        subscription: {
            subscriptionId: customer.subscription.subscriptionId,
            plan: customer.subscription.plan,
            status: customer.subscription.status,
            startedAt: customer.subscription.startedAt,
            expiredAt: customer.subscription.expiredAt,
        },
        address: customer.customer.address
    }
}

const validateIfCanChangeSubscription = async (customerId: string, activePlan: SubscriptionPlanType, newPlan: SubscriptionPlanType): Promise<void> => {
    if (activePlan === newPlan) {
        throw new CustomerException(`Customer ${customerId} already has ${newPlan} subscription active.`)
    }

    const newSubscriptionPlan = configurationService.getSubscriptionPlan(newPlan)
    const customerResources = await getCustomerResources(customerId)

    if (newSubscriptionPlan.maxExhibitions < customerResources.exhibitionsCount) {
        throw new CustomerException(`Customer ${customerId} has ${customerResources.exhibitionsCount} exhibitions, but ${newPlan} subscription allows at max ${newSubscriptionPlan.maxExhibitions}.`, 409)
    }

    if (newSubscriptionPlan.maxExhibits < customerResources.exhibitsCount) {
        throw new CustomerException(`Customer ${customerId} has ${customerResources.exhibitsCount} exhibits, but ${newPlan} subscription allows at max ${newSubscriptionPlan.maxExhibits}.`, 409)
    }

    if (newSubscriptionPlan.maxLanguages < customerResources.maxLanguages) {
        throw new CustomerException(`Customer ${customerId} has items with ${customerResources.maxLanguages} languages, but ${newPlan} subscription allows at max ${newSubscriptionPlan.maxLanguages} per item.`, 409)
    }
}

const getCustomerResources = async (customerId: string): Promise<CustomerResources> => {
    const CustomerResourcesService = new Service({
        exhibition: ExhibitionDao,
        exhibit: ExhibitDao,
    });

    const customerResourcesResponseItem = await CustomerResourcesService
        .collections
        .customerResources({
            customerId: customerId
        })
        .go({
            pages: "all"
        })

    const exhibitions = customerResourcesResponseItem.data.exhibition
    const exhibits = customerResourcesResponseItem.data.exhibit

    const maxLanguagesInExhibitions = exhibitions.reduce((acc, exhibition) => acc + exhibition.langOptions.length, 0)
    const maxLanguagesInExhibits = exhibits.reduce((acc, exhibit) => acc + exhibit.langOptions.length, 0)
    const maxLanguages = maxLanguagesInExhibitions > maxLanguagesInExhibits ? maxLanguagesInExhibitions : maxLanguagesInExhibits

    return {
        customerId: customerId,
        exhibitionsCount: exhibitions.length,
        exhibitsCount: exhibits.length,
        maxLanguages: maxLanguages
    }
}

const getCustomerWithSubscriptions = async (customerId: string): Promise<CustomerWithSubscriptions> => {
    const CustomerSubscriptionsService = new Service({
        customer: CustomerDao,
        subscription: SubscriptionDao,
    });

    const customerWithSubscriptionsResponseItem = await CustomerSubscriptionsService
        .collections
        .customerWithSubscriptions({
            customerId: customerId
        })
        .go({
            pages: "all"
        })

    const customers = customerWithSubscriptionsResponseItem.data.customer
    const subscriptions = customerWithSubscriptionsResponseItem.data.subscription

    if (customers.length !== 1) {
        throw new CustomerException(`Customer with id ${customerId} not found, or configured incorrectly.`)
    }

    return {
        customer: customers[0],
        subscriptions: subscriptions
    }
}

const getCustomerWithActiveSubscription = async (customerId: string): Promise<CustomerWithSubscription> => {
    const {customer, subscriptions} = await getCustomerWithSubscriptions(customerId)
    const activeSubscription = getActiveSubscriptionFor(customerId, subscriptions)

    return {
        customer: customer,
        subscription: activeSubscription
    }
}

const getActiveSubscriptionFor = (customerId: string, subscriptions: Subscription[]): Subscription => {
    const activeSubscriptions = subscriptions.filter(subscription => subscription.status === "ACTIVE")

    if (activeSubscriptions.length > 1) {
        throw new CustomerException(`Configuration error. Customer ${customerId} has more than one active subscription.`)
    }

    if (activeSubscriptions.length < 1) {
        throw new CustomerException(`Customer ${customerId} has no active subscription.`)
    }

    return activeSubscriptions[0]
}

const authorizeResourceCreation = async (customerId: string, resource: Exposable): Promise<void> => {
    const customerPromise = getCustomerWithActiveSubscription(customerId)
    const customerResourcesPromise = getCustomerResources(customerId)
    const [{customer, subscription}, customerResources] = await Promise.all([
        customerPromise,
        customerResourcesPromise
    ])
    const subscriptionPlan = configurationService.getSubscriptionPlan(subscription.plan)

    if (customer.status !== "ACTIVE") {
        throw new CustomerException(`Customer ${customerId} is not active. Customer status: ${customer.status}`, 403)
    }

    if (isExhibition(resource) && subscriptionPlan.maxExhibitions <= customerResources.exhibitionsCount) {
        throw new CustomerException(`Customer ${customerId} has reached the maximum number of exhibitions allowed by the subscription ${subscription.plan}.`, 403)
    }

    if (isExhibit(resource) && subscriptionPlan.maxExhibits <= customerResources.exhibitsCount) {
        throw new CustomerException(`Customer ${customerId} has reached the maximum number of exhibits allowed by the subscription ${subscription.plan}.`, 403)
    }

    if (resource.langOptions.length > subscriptionPlan.maxLanguages) {
        throw new CustomerException(`Customer ${customerId} has reached the maximum number of languages for resource allowed by the subscription ${subscription.plan}.`, 403)
    }
}

const authorizeResourceUpdate = async (customerId: string, resource: Exposable): Promise<void> => {
    const {customer, subscription} = await getCustomerWithActiveSubscription(customerId)
    const subscriptionPlan = configurationService.getSubscriptionPlan(subscription.plan)

    if (customer.status !== "ACTIVE") {
        throw new CustomerException(`Customer ${customerId} is not active. Customer status: ${customer.status}`, 403)
    }

    if (resource.langOptions.length > subscriptionPlan.maxLanguages) {
        throw new CustomerException(`Customer ${customerId} has reached the maximum number of languages for resource allowed by the subscription ${subscription.plan}.`, 403)
    }
}

export const customerService = {
    createCustomer: createCustomer,
    getCustomerDetails: getCustomerDetails,
    updateCustomerDetails: updateCustomerDetails,
    changeSubscription: changeSubscription,
    authorizeResourceCreation: authorizeResourceCreation,
    authorizeResourceUpdate: authorizeResourceUpdate,
};