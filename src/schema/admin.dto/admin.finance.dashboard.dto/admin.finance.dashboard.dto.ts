import { z } from "zod";

//To find all active students for Admin
export const findAllFeePaymentRecordsSchema = z.object({
    query: z.object({
        page: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional(),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional()
    })
});
export type FindAllFeePaymentRecordsSchema = z.infer<typeof findAllFeePaymentRecordsSchema>;