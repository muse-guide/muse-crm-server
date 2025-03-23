import {CustomerDao, CustomerResources, CustomerWithSubscription, SubscriptionDao} from "../model/customer";
import {SubscriptionPlanType} from "../model/common";
import {Exposable, getCurrentDate, isExhibit, isExhibition, isInstitution} from "./common";
import {UpdateCustomerDetailsDto} from "../schema/customer";
import {Service} from "electrodb";
import {CustomerException} from "../common/exceptions";
import {ExhibitDao} from "../model/exhibit";
import {nanoid} from "nanoid";
import {ExhibitionDao} from "../model/exhibition";
import {configurationService} from "./configuration";
import {logger} from "../common/logger";
import {InstitutionDao} from "../model/institution";

// Creates new Customer with FREE subscription
const createCustomer = async (customerId: string, email: string): Promise<CustomerWithSubscription> => {
    try {
        return await getCustomerWithSubscription(customerId)
    } catch (e) {
        if (e instanceof CustomerException) {
            logger.info(`Customer ${customerId} not found. Creating new customer.`)
            return createNewCustomer(customerId, email)
        }
        throw e
    }
}

const createNewCustomer = async (customerId: string, email: string): Promise<CustomerWithSubscription> => {
    const customerResponsePromise = CustomerDao
        .create({
            customerId: customerId,
            email: email,
            status: 'ACTIVE',
        })
        .go()

    const freeSubscriptionConfiguration = configurationService.getSubscriptionPlan("FREE")

    const subscriptionResponsePromise = SubscriptionDao
        .create({
            subscriptionId: nanoid(),
            customerId: customerId,
            plan: freeSubscriptionConfiguration.name,
            status: 'ACTIVE',
            tokenCount: freeSubscriptionConfiguration.tokenCount,
            startedAt: getCurrentDate(),
            expiredAt: undefined,
        })
        .go()


    const [customerResponse, subscriptionResponse] = await Promise.all([
        customerResponsePromise,
        subscriptionResponsePromise,
    ])

    const customer = customerResponse.data
    const subscription = subscriptionResponse.data

    return {
        customer: customer,
        subscription: subscription
    }
}

const updateCustomerDetails = async (customerId: string, updateCustomerDetails: UpdateCustomerDetailsDto): Promise<CustomerWithSubscription> => {
    await getCustomerWithSubscription(customerId)

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

    return getCustomerWithSubscription(customerId)
}

const changeSubscription = async (customerId: string, newPlan: SubscriptionPlanType): Promise<CustomerWithSubscription> => {
    const {customer, subscription} = await getCustomerWithSubscription(customerId)

    await validateIfCanChangeSubscription(customerId, subscription.plan, newPlan)

    const updatedSubscriptionPromise = SubscriptionDao
        .patch({
            subscriptionId: subscription.subscriptionId,
        })
        .set({
            status: "DEACTIVATED",
            version: Date.now(),
            expiredAt: getCurrentDate(),
        })
        .go({
            response: "all_new"
        })

    const newSubscriptionPlan = configurationService.getSubscriptionPlan(newPlan)

    const createSubscriptionPromise = SubscriptionDao
        .create({
            subscriptionId: nanoid(),
            customerId: customerId,
            plan: newSubscriptionPlan.name,
            status: "AWAITING_PAYMENT",
            tokenCount: newSubscriptionPlan.tokenCount,
            startedAt: getCurrentDate(),
            expiredAt: undefined,
        })
        .go()

    const [_, createSubscriptionResponseItem] = await Promise.all([
        updatedSubscriptionPromise,
        createSubscriptionPromise
    ])

    return {
        customer: customer,
        subscription: createSubscriptionResponseItem.data
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
        institution: InstitutionDao,
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

    const institutions = customerResourcesResponseItem.data.institution
    const exhibitions = customerResourcesResponseItem.data.exhibition
    const exhibits = customerResourcesResponseItem.data.exhibit

    const maxLanguagesInInstitutions = institutions.reduce((acc, institution) => acc + institution.langOptions.length, 0)
    const maxLanguagesInExhibitions = exhibitions.reduce((acc, exhibition) => acc + exhibition.langOptions.length, 0)
    const maxLanguagesInExhibits = exhibits.reduce((acc, exhibit) => acc + exhibit.langOptions.length, 0)
    const maxLanguages = Math.max(maxLanguagesInInstitutions, maxLanguagesInExhibitions, maxLanguagesInExhibits);

    return {
        customerId: customerId,
        institutionsCount: institutions.length,
        exhibitionsCount: exhibitions.length,
        exhibitsCount: exhibits.length,
        maxLanguages: maxLanguages
    }
}

const getCustomerWithSubscription = async (customerId: string): Promise<CustomerWithSubscription> => {
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

    if (customers[0].status !== "ACTIVE") {
        throw new CustomerException(`Customer ${customerId} is not active. Customer status: ${customers[0].status}`)
    }

    const activeSubscriptions = subscriptions.filter(subscription => subscription.status === "ACTIVE")

    if (activeSubscriptions.length > 1) {
        throw new CustomerException(`Configuration error. Customer ${customerId} has more than one active subscription.`)
    }

    if (activeSubscriptions.length < 1) {
        throw new CustomerException(`Customer ${customerId} has no active subscription.`)
    }

    return {
        customer: customers[0],
        subscription: activeSubscriptions[0]
    }
}

const authorizeResourceCreation = async (customerId: string, resource: Exposable): Promise<void> => {
    const customerPromise = getCustomerWithSubscription(customerId)
    const customerResourcesPromise = getCustomerResources(customerId)
    const [{customer, subscription}, customerResources] = await Promise.all([
        customerPromise,
        customerResourcesPromise
    ])
    const subscriptionPlan = configurationService.getSubscriptionPlan(subscription.plan)

    if (customer.status !== "ACTIVE") {
        throw new CustomerException(`Customer ${customerId} is not active. Customer status: ${customer.status}`, 403)
    }

    if (isInstitution(resource) && customerResources.institutionsCount > 0) {
        throw new CustomerException(`Customer ${customerId} already has an institution.`, 403)
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
    const {subscription} = await getCustomerWithSubscription(customerId)
    const subscriptionPlan = configurationService.getSubscriptionPlan(subscription.plan)

    if (resource.langOptions.length > subscriptionPlan.maxLanguages) {
        throw new CustomerException(`Customer ${customerId} has reached the maximum number of languages for resource allowed by the subscription ${subscription.plan}.`, 403)
    }
}

export const customerService = {
    // Public API methods
    createCustomer: createCustomer,
    getCustomerWithSubscription: getCustomerWithSubscription,
    updateCustomerDetails: updateCustomerDetails,
    changeSubscription: changeSubscription,

    // Internal methods
    authorizeResourceCreation: authorizeResourceCreation,
    authorizeResourceUpdate: authorizeResourceUpdate,
};