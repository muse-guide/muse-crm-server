import {z} from "zod";
import { subscriptionPlanType} from "../model/common";

export interface CustomerDto {
    customerId: string
    email: string
    status: string
    subscription: {
        subscriptionId: string
        plan: string
        status: string
        startedAt: string
        expiredAt: string | undefined
    }
}

export const updateSubscriptionSchema = z.object({
    newPlan: z.enum(subscriptionPlanType)
})