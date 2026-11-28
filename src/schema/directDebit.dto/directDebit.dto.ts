import { z } from 'zod';

export const createSetupSessionSchema = z.object({
    body: z.object({
        payExistingBalance: z.boolean().optional(),
        returnTo: z.enum(['web', 'app']).optional(),
        /** Web only: the page to come back to (keeps ?studentId=). Ignored unless it is one of our own web hosts. */
        returnUrl: z.string().max(2000).optional()
    })
});

export const studentIdParamSchema = z.object({
    params: z.object({ studentId: z.string().regex(/^\d+$/) })
});

export const adminMandateActionSchema = z.object({
    params: z.object({ mandateId: z.string().regex(/^\d+$/) }),
    body: z.object({ action: z.enum(['PAUSE', 'RESUME', 'CANCEL']) })
});

export const chargeIdParamSchema = z.object({
    params: z.object({ chargeId: z.string().regex(/^\d+$/) })
});

export const updateDirectDebitSettingsSchema = z.object({
    body: z
        .object({
            enabled: z.boolean(),
            access: z.enum(['ALL_FAMILIES', 'SELECTED_FAMILIES']),
            runTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Run time must be HH:MM (24-hour)'),
            frequency: z.enum(['DAILY', 'WEEKDAYS', 'WEEKLY', 'MONTHLY', 'QUARTERLY']),
            runWeekday: z.number().int().min(0).max(6),
            runMonthDay: z.number().int().refine((d) => (d >= 1 && d <= 28) || d === 31, 'Day of the month must be 1-28 or 31 (last day)'),
            runQuarterMonth: z.number().int().min(1).max(3),
            reminderDaysBefore: z.number().int().min(0).max(14),
            allowPayExistingBalance: z.boolean(),
            officeEmail: z.union([z.string().email(), z.literal(''), z.null()])
        })
        .partial()
});

export const addFamilyAccessSchema = z.object({
    body: z.object({ email: z.string().email() })
});

export const accessIdParamSchema = z.object({
    params: z.object({ id: z.string().regex(/^\d+$/) })
});

export const familySearchSchema = z.object({
    query: z.object({ search: z.string().max(100).optional() })
});

const emailKeyParams = z.object({ key: z.string().regex(/^[A-Z_]{3,40}$/) });

export const saveDirectDebitEmailSchema = z.object({
    params: emailKeyParams,
    body: z.object({ subject: z.string().min(1).max(300), body: z.string().min(1).max(10000), enabled: z.boolean() })
});

export const directDebitEmailKeySchema = z.object({ params: emailKeyParams });

export const previewDirectDebitEmailSchema = z.object({
    params: emailKeyParams,
    body: z.object({ subject: z.string().max(300).optional(), body: z.string().max(10000).optional() }).optional()
});
