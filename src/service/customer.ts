import {CustomerDao, CustomerResources, CustomerWithSubscription, Subscription, SubscriptionDao} from "../model/customer";
import {SubscriptionPlanType} from "../model/common";
import {Exposable, getCurrentDate, getDateString, isExhibit, isExhibition, isInstitution} from "./common";
import {UpdateCustomerDetailsDto} from "../schema/customer";
import {Service} from "electrodb";
import {CustomerException} from "../common/exceptions";
import {ExhibitDao} from "../model/exhibit";
import {nanoid} from "nanoid";
import {ExhibitionDao} from "../model/exhibition";
import {configurationService} from "./configuration";
import {InstitutionDao} from "../model/institution";

const createNewCustomer = async (customerId: string, email: string): Promise<CustomerWithSubscription> => {
    const {data: customer} = await CustomerDao
        .get({
            customerId: customerId
        })
        .go()

    if (customer) {
        throw new CustomerException(`apiError.customerAlreadyExist`, 409)
    }

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

    return {
        customer: customerResponse.data,
        subscription: subscriptionResponse.data
    }
}

const updateCustomerDetails = async (customerId: string, updateCustomerDetails: UpdateCustomerDetailsDto): Promise<CustomerWithSubscription> => {
    await getCustomerWithSubscription(customerId)

    const {data: customerResponseItem} = await CustomerDao
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

    if (subscription.status !== "ACTIVE") {
        throw new CustomerException(`apiError.customerNoActiveSubscription`, 403)
    }

    await validateIfCanChangeSubscription(customerId, subscription.plan, newPlan)

    const updatedSubscriptionPromise = SubscriptionDao
        .patch({
            subscriptionId: subscription.subscriptionId,
        })
        .set({
            status: "DEACTIVATED",
            expiredAt: getCurrentDate(),
        })
        .go({
            response: "all_new"
        })

    const newSubscriptionPlan = configurationService.getSubscriptionPlan(newPlan)
    const startDate = getCurrentDate()
    let expiredAtDate = undefined
    if (newSubscriptionPlan.durationMonths) {
        expiredAtDate = new Date(startDate)
        expiredAtDate.setMonth(expiredAtDate.getMonth() + newSubscriptionPlan.durationMonths)
        expiredAtDate = getDateString(expiredAtDate)
    }

    const createSubscriptionPromise = SubscriptionDao
        .create({
            subscriptionId: nanoid(),
            customerId: customerId,
            plan: newSubscriptionPlan.name,
            status: "AWAITING_PAYMENT",
            tokenCount: newSubscriptionPlan.tokenCount,
            startedAt: startDate,
            expiredAt: expiredAtDate,
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
        throw new CustomerException(`apiError.customerPlanAlreadyActive`)
    }

    const newSubscriptionPlan = configurationService.getSubscriptionPlan(newPlan)
    const customerResources = await getCustomerResources(customerId)

    if (newSubscriptionPlan.maxExhibitions < customerResources.exhibitionsCount) {
        throw new CustomerException(`apiError.customerMaxExhibitionCountReached`, 409)
    }

    if (newSubscriptionPlan.maxExhibits < customerResources.exhibitsCount) {
        throw new CustomerException(`apiError.customerMaxExhibitCountReached`, 409)
    }

    if (newSubscriptionPlan.maxLanguages < customerResources.maxLanguages) {
        throw new CustomerException(`apiError.customerMaxLangOptionsReached`, 409)
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

    const maxLanguagesInInstitutions = institutions
        .flatMap(institution => institution.langOptions)
        .map(langOption => langOption.lang)
        .filter((lang, index, self) => self.indexOf(lang) === index)
        .length

    const maxLanguagesInExhibitions = exhibitions
        .flatMap(exhibition => exhibition.langOptions)
        .map(langOption => langOption.lang)
        .filter((lang, index, self) => self.indexOf(lang) === index)
        .length

    const maxLanguagesInExhibits = exhibits
        .flatMap(exhibit => exhibit.langOptions)
        .map(langOption => langOption.lang)
        .filter((lang, index, self) => self.indexOf(lang) === index)
        .length

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
        throw new CustomerException(`apiError.customerNotExist`, 404)
    }

    if (customers[0].status === "DEACTIVATED") {
        throw new CustomerException(`apiError.customerDeactivated`, 403)
    }

    const currentSubscription = subscriptions.filter(subscription => {
        const now = getCurrentDate()
        return subscription.status !== "DEACTIVATED"
            && subscription.startedAt <= now
            && (!subscription.expiredAt || subscription.expiredAt >= now)
    })

    if (currentSubscription.length > 1) {
        throw new CustomerException(`apiError.customerConfigurationError`)
    }

    if (currentSubscription.length < 1) {
        throw new CustomerException(`apiError.customerNoActiveSubscription`, 403)
    }

    return {
        customer: customers[0],
        subscription: currentSubscription[0]
    }
}

const authorizeResourceCreationAndLock = async (customerId: string, resource: Exposable, tokensUsed: number): Promise<CustomerWithSubscription> => {
    const customerPromise = getCustomerWithSubscription(customerId)
    const customerResourcesPromise = getCustomerResources(customerId)
    const [{customer, subscription}, customerResources] = await Promise.all([
        customerPromise,
        customerResourcesPromise
    ])
    const subscriptionPlan = configurationService.getSubscriptionPlan(subscription.plan)

    if (subscription.status !== "ACTIVE") {
        throw new CustomerException(`apiError.customerNoActiveSubscription`, 403)
    }

    if (subscription.tokenCount - tokensUsed < 0) {
        throw new CustomerException(`apiError.customerNoTokensAvailable`, 403)
    }

    if (isInstitution(resource) && customerResources.institutionsCount > 0) {
        throw new CustomerException(`apiError.customerInstitutionAlreadyCreate`, 403)
    }

    if (isExhibition(resource) && subscriptionPlan.maxExhibitions <= customerResources.exhibitionsCount) {
        throw new CustomerException(`apiError.customerMaxExhibitionCountReached`, 403)
    }

    if (isExhibit(resource) && subscriptionPlan.maxExhibits <= customerResources.exhibitsCount) {
        throw new CustomerException(`apiError.customerMaxExhibitCountReached`, 403)
    }

    if (resource.langOptions.length > subscriptionPlan.maxLanguages) {
        throw new CustomerException(`apiError.customerMaxLangOptionsReached`, 403)
    }

    // Lock subscription to prevent concurrent operations
    await updateTokenCountAndLockSubscription(subscription, tokensUsed)

    return {
        customer: customer,
        subscription: subscription
    }
}

const authorizeResourceUpdateAndLock = async (customerId: string, resource: Exposable, tokensUsed: number): Promise<CustomerWithSubscription> => {
    const {customer, subscription} = await getCustomerWithSubscription(customerId)
    const subscriptionPlan = configurationService.getSubscriptionPlan(subscription.plan)

    if (subscription.status !== "ACTIVE") {
        throw new CustomerException(`apiError.customerNoActiveSubscription`, 403)
    }

    if (subscription.tokenCount - tokensUsed < 0) {
        throw new CustomerException(`apiError.customerNoTokensAvailable`, 403)
    }

    if (resource.langOptions.length > subscriptionPlan.maxLanguages) {
        throw new CustomerException(`apiError.customerMaxLangOptionsReached`, 403)
    }

    // Lock subscription to prevent concurrent operations
    await updateTokenCountAndLockSubscription(subscription, tokensUsed)

    return {
        customer: customer,
        subscription: subscription
    }
}

const authorizeAudioPreviewCreationAndLock = async (customerId: string, tokensUsed: number): Promise<CustomerWithSubscription> => {
    const {customer, subscription} = await getCustomerWithSubscription(customerId)

    if (subscription.status !== "ACTIVE") {
        throw new CustomerException(`apiError.customerNoActiveSubscription`, 403)
    }

    if (subscription.tokenCount - tokensUsed < 0) {
        throw new CustomerException(`apiError.customerNoTokensAvailable`, 403)
    }

    // Lock subscription to prevent concurrent operations
    await updateTokenCountAndLockSubscription(subscription, tokensUsed)

    return {
        customer: customer,
        subscription: subscription
    }
}

const unlockSubscription = async (subscriptionId: string | undefined): Promise<void> => {
    if (!subscriptionId) {
        throw new CustomerException(`apiError.customerSubscriptionIdMissing`, 400)
    }

    const {data: subscription} = await SubscriptionDao
        .get({
            subscriptionId: subscriptionId
        })
        .go()

    if (!subscription) {
        throw new CustomerException(`apiError.customerSubscriptionNotFound`, 404)
    }

    if (subscription.status !== "LOCKED") {
        throw new CustomerException(`apiError.customerSubscriptionNotLocked`, 403)
    }

    await SubscriptionDao
        .patch({
            subscriptionId: subscription.subscriptionId,
        })
        .set({
            status: "ACTIVE",
        })
        .go({
            response: "all_new"
        })
}

const updateTokenCountAndLockSubscription = async (subscription: Subscription, tokenCount: number): Promise<void> => {
    await SubscriptionDao
        .patch({
            subscriptionId: subscription.subscriptionId,
        })
        .set({
            tokenCount: subscription.tokenCount - tokenCount,
            status: "LOCKED",
        })
        .go({
            response: "all_new"
        })
}

export const customerService = {
    // Public API methods
    createNewCustomer: createNewCustomer,
    getCustomerWithSubscription: getCustomerWithSubscription,
    updateCustomerDetails: updateCustomerDetails,
    changeSubscription: changeSubscription,

    // Internal methods
    authorizeResourceCreationAndLock: authorizeResourceCreationAndLock,
    authorizeResourceUpdateAndLock: authorizeResourceUpdateAndLock,
    unlockSubscription: unlockSubscription,
    authorizeAudioPreviewCreationAndLock: authorizeAudioPreviewCreationAndLock
};