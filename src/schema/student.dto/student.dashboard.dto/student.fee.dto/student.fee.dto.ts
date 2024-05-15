import { z } from 'zod';

export const fetchFeePaymentsForCurrentTermByStudentIdSchema = z.object({
    params: z.object({
        studentId: z.string().regex(/^\d+$/, 'Student ID must be a numeric string')
    })
});
export type FetchFeePaymentsForCurrentTermByStudentIdSchema = z.infer<typeof fetchFeePaymentsForCurrentTermByStudentIdSchema>;

export const feePaymentIdParamSchema = z.object({
    params: z.object({
        feePaymentId: z.string().regex(/^\d+$/, 'Fee Payment ID must be a numeric string')
    })
});
export type FeePaymentIdParamSchema = z.infer<typeof feePaymentIdParamSchema>;

export const getPaymentsByFeePaymentIdStudentSchema = z.object({
    params: z.object({
        feePaymentId: z.string().min(1)
    })
});
export type GetPaymentsByFeePaymentIdStudentSchema = z.infer<typeof getPaymentsByFeePaymentIdStudentSchema>;
