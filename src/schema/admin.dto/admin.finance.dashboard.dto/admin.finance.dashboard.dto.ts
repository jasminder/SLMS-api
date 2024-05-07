import { z } from 'zod';

//To find all active students for Admin
export const findAllFeePaymentRecordsSchema = z.object({
    query: z.object({
        search: z.string().optional(),
        page: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional(),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional(),
        dueAmountSort: z.string().optional(),
        paymentStatus: z.string().optional(),
        invoiceName: z.string().optional()
    })
});
export type FindAllFeePaymentRecordsSchema = z.infer<typeof findAllFeePaymentRecordsSchema>;

export const selectAllFeePaymentsSchema = z.object({
    query: z.object({
        search: z.string().optional(),
        page: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional(),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional(),
        dueAmountSort: z.string().optional(),
        paymentStatus: z.string().optional(),
        invoiceName: z.string().optional()
    })
});
export type SelectAllFeePaymentsSchema = z.infer<typeof selectAllFeePaymentsSchema>;

export const getAllInvoiceNamesByTermIdSchema = z.object({
    query: z.object({
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type GetAllInvoiceNamesByTermIdSchema = z.infer<typeof getAllInvoiceNamesByTermIdSchema>;
