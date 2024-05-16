import { z } from 'zod';

export const createCheckoutSessionSchema = z.object({
    body: z.object({
        feePaymentId: z.string(),
        amount: z.string(),
        invoiceName: z.string(),
        invoiceId: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string()
    })
});
export type CreateCheckoutSessionSchema = z.infer<typeof createCheckoutSessionSchema>;
