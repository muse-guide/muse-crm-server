import {Invoice, InvoiceDao} from "../model/invoice";
import {ConfigurationException, NotFoundException} from "../common/exceptions";
import {Subscription, SubscriptionDao} from "../model/customer";
import {logger} from "../common/logger";
import {configurationService} from "./configuration";
import {nanoid_12, SubscriptionPlanType} from "../model/common";
import {customerService} from "./customer";
import {getDateString, roundToPrecision} from "./common";
import {InvoicePeriod} from "../model/configuration";
import {InvoiceDetailsDto, InvoiceDto} from "../schema/invoice";

const createInvoices = async (invoicePeriod: InvoicePeriod): Promise<Invoice[]> => {
    const subscriptionsPerCustomer = await getActiveSubscriptionsPerCustomerFor(invoicePeriod)

    if (Object.keys(subscriptionsPerCustomer).length === 0) {
        logger.info(`No active subscriptions found for invoice period ${invoicePeriod.periodStart} - ${invoicePeriod.periodEnd}`)
        return []
    }

    const invoices = []
    for (const [index, customerId] of Object.keys(subscriptionsPerCustomer).entries()) {
        const subscriptions: Subscription[] = subscriptionsPerCustomer[customerId]
        const invoice = await createInvoiceForCustomer(customerId, subscriptions, invoicePeriod, index)
        if (invoice) invoices.push(invoice)
    }

    return invoices
}

const createInvoiceForCustomer = async (customerId: string, subscriptions: Subscription[], invoicePeriod: InvoicePeriod, index: number): Promise<Invoice | undefined> => {

    const customer = await customerService.getCustomerWithActiveSubscription(customerId)
    if (customer.customer.status !== 'ACTIVE') return undefined
    if (!customer.customer.createdAt) throw new ConfigurationException(`Customer ${customerId} has no creation date`)

    logger.info(`Creating invoice for customer ${customerId} with ${subscriptions.length} active subscriptions`)

    const customerCreatedAt = getDateString(new Date(customer.customer.createdAt))
    const periodStart = customerCreatedAt > invoicePeriod.periodStart
        ? customerCreatedAt
        : invoicePeriod.periodStart


    const invoicePeriodLength = Math.floor(1 + (new Date(invoicePeriod.periodEnd).getTime() - new Date(periodStart).getTime()) / (1000 * 60 * 60 * 24))

    const invoiceItems = subscriptions.map(subscription => {
        const activeFrom = subscription.startedAt > periodStart ? subscription.startedAt : periodStart
        const activeTo = subscription.expiredAt ? (subscription.expiredAt < invoicePeriod.periodEnd ? subscription.expiredAt : invoicePeriod.periodEnd) : invoicePeriod.periodEnd
        const activeLength = 1 + (new Date(activeTo).getTime() - new Date(activeFrom).getTime()) / (1000 * 60 * 60 * 24)

        return {
            plan: subscription.plan,
            activeFrom: activeFrom,
            activeTo: activeTo,
            amount: calculateInvoiceItemAmount(subscription.plan, invoicePeriodLength, activeLength)
        }
    })

    const invoiceAmount = invoiceItems.reduce((acc, item) => acc + item.amount, 0)
    const invoiceAmountRounded = roundToPrecision(invoiceAmount)

    const invoice: Invoice = {
        invoiceId: nanoid_12(),
        invoiceBusinessId: invoicePeriod.invoicePrefix + "/" + (index + 1),
        customerId: customerId,
        periodStart: invoicePeriod.periodStart,
        periodEnd: invoicePeriod.periodEnd,
        paymentDue: invoicePeriod.paymentDue,
        issuedAt: getDateString(new Date()),
        soldAt: getDateString(new Date()),
        invoiceItems: invoiceItems.map(item => ({
            plan: item.plan,
            activeFrom: item.activeFrom,
            activeTo: item.activeTo,
            amount: item.amount.toString()
        })),
        amount: invoiceAmountRounded.toString(),
        status: "ISSUED",
        subscriptions: subscriptions.map(subscription => subscription.subscriptionId),
    }

    const {data: createdInvoice} = await InvoiceDao
        .create(invoice)
        .go()

    logger.info(`Created invoice ${invoice.invoiceId} for customer ${customerId} with amount ${invoice.amount}`)

    return createdInvoice
}

const calculateInvoiceItemAmount = (plan: SubscriptionPlanType, invoicePeriodLength: number, activeLength: number) => {
    const planPrice = configurationService.getSubscriptionPlan(plan).price
    const amount = planPrice * activeLength / invoicePeriodLength

    return roundToPrecision(amount)
}

const getActiveSubscriptionsPerCustomerFor = async (invoicePeriod: InvoicePeriod) => {
    const subscriptionsResponse = await SubscriptionDao
        .scan
        .where(
            ({startedAt, expiredAt}, {between, notExists}) =>
                `${between(startedAt, invoicePeriod.periodStart, invoicePeriod.periodEnd)}
                OR ${between(expiredAt, invoicePeriod.periodStart, invoicePeriod.periodEnd)}
                OR ${notExists(expiredAt)}`
        )
        .go({
            pages: "all"
        })

    const subscriptions = subscriptionsResponse.data
    logger.info(`Found ${subscriptions.length} active subscriptions for invoice period ${invoicePeriod.periodStart} - ${invoicePeriod.periodEnd}`)

    const subscriptionsPerCustomers = subscriptions.reduce((result: any, currentValue: any) => {
        (result[currentValue['customerId']] = result[currentValue['customerId']] || []).push(currentValue);
        return result;
    }, {});

    logger.info(`Found ${Object.keys(subscriptionsPerCustomers).length} customers with active subscriptions for invoice period ${invoicePeriod.periodStart} - ${invoicePeriod.periodEnd}`)

    return subscriptionsPerCustomers
}

export interface InvoiceFilters {
    periodFrom: string,
    periodTo: string
}

const getInvoicesForCustomer = async (customerId: string, filters: InvoiceFilters): Promise<InvoiceDto[]> => {
    const {periodFrom, periodTo} = filters
    const response = await InvoiceDao
        .query
        .byCustomerId({
            customerId: customerId
        })
        .where(
            ({periodStart, periodEnd}, {between}) =>
                `${between(periodStart, periodFrom, periodTo)}
                AND ${between(periodEnd, periodFrom, periodTo)}`
        )
        .go({
            pages: "all"
        })

    return response.data.map(mapInvoiceToDto)
}

const getInvoiceForCustomer = async (customerId: string, invoiceId: string): Promise<InvoiceDetailsDto> => {
    const {data: invoice} = await InvoiceDao
        .get({
            invoiceId: invoiceId
        })
        .go()

    if (!invoice || customerId !== invoice.customerId) {
        throw new NotFoundException("Invoice does not exist.")
    }

    return {
        ...mapInvoiceToDto(invoice),
        issuedAt: invoice.issuedAt,
        soldAt: invoice.soldAt,
        invoiceItems: invoice.invoiceItems.map(item => ({
            plan: item.plan,
            activeFrom: item.activeFrom,
            activeTo: item.activeTo,
            amount: item.amount
        }))
    }
}

const mapInvoiceToDto = (invoice: Invoice): InvoiceDto => {
    return {
        invoiceId: invoice.invoiceId,
        invoiceBusinessId: invoice.invoiceBusinessId,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        paymentDue: invoice.paymentDue,
        amount: invoice.amount,
        status: invoice.status
    }
}

export const invoiceService = {
    createInvoices: createInvoices,
    getInvoicesForCustomer: getInvoicesForCustomer,
    getInvoiceForCustomer: getInvoiceForCustomer
}