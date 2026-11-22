import { z } from 'zod';

const params = z.object({ studentId: z.string().regex(/^\d+$/, { message: 'Student id is required' }) });

/** B4 "Add credit": the same details as a fee payment. */
export const addStudentCreditSchema = z.object({
    params,
    body: z.object({
        amount: z.coerce.number().int({ message: 'Use whole dollars' }).positive({ message: 'Please enter an amount above $0' }),
        paymentMethod: z.string().min(1, { message: 'Please choose how the money was received' }),
        entryDate: z.string().min(1, { message: 'Please enter the date the money was received' }),
        note: z.string().trim().min(1, { message: 'Please add a note' }).max(500)
    })
});
export type AddStudentCreditSchema = z.infer<typeof addStudentCreditSchema>;

/** B4 correction: a signed amount with a required reason. */
export const correctStudentCreditSchema = z.object({
    params,
    body: z.object({
        amount: z.coerce.number().int({ message: 'Use whole dollars' }).refine((n) => n !== 0, { message: 'The correction cannot be $0' }),
        note: z.string().trim().min(1, { message: 'Please give the reason' }).max(500)
    })
});
export type CorrectStudentCreditSchema = z.infer<typeof correctStudentCreditSchema>;

export const studentCreditHistorySchema = z.object({ params });
export type StudentCreditHistorySchema = z.infer<typeof studentCreditHistorySchema>;
