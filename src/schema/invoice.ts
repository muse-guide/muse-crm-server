export interface InvoiceDto {
    invoiceId: string,
    invoiceBusinessId: string,
    periodStart: string,
    periodEnd: string,
    paymentDue: string,
    amount: string,
    status: string
}

export interface InvoiceDetailsDto {
    invoiceId: string,
    invoiceBusinessId: string,
    periodStart: string,
    periodEnd: string,
    paymentDue: string,
    amount: string,
    status: string,
    issuedAt: string,
    soldAt: string,
    invoiceItems: InvoiceItemDto[]
}

export interface InvoiceItemDto {
    plan: string,
    activeFrom: string,
    activeTo: string,
    amount: string,
}

export const invoicePaymentStatus = ["ALL", "PAID", "UNPAID"] as const
