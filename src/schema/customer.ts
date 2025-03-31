import {z} from "zod";
import {subscriptionPlanType} from "../model/common";

export interface CustomerDto {
    customerId: string
    email: string
    status: string
    fullName?: string
    taxNumber?: string
    telephoneNumber?: string
    subscription: {
        subscriptionId: string
        plan: string
        status: string
        startedAt: string
        expiredAt?: string,
        tokenCount: number
    }
    address?: AddressDto
}

export interface AddressDto {
    street?: string
    houseNumber?: string
    houseNumberExtension?: string
    city?: string
    zipCode?: string
    country?: string
}

export const updateCustomerDetailsSchema = z.object({
    fullName: z.string().min(1).max(200).optional(),
    taxNumber: z.string().min(1).max(64).optional(),
    telephoneNumber: z.string().min(1).max(20).optional(),
    address: z.object({
        street: z.string().min(1).max(200).optional(),
        houseNumber: z.string().min(1).max(20).optional(),
        houseNumberExtension: z.string().min(1).max(20).optional(),
        city: z.string().min(1).max(100).optional(),
        zipCode: z.string().min(1).max(20).optional(),
        country: z.string().min(1).max(100).optional(),
    }).optional()
})

export type UpdateCustomerDetailsDto = z.infer<typeof updateCustomerDetailsSchema>

export const updateSubscriptionSchema = z.object({
    newPlan: z.enum(subscriptionPlanType)
})