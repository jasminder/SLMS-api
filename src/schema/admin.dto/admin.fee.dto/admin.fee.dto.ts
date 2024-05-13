import { z } from 'zod';

export const feeTemplateSchema = z.object({
    body: z.object({
        studentIds: z.array(z.string()),
        interval: z.string(),
        invoiceName: z.string(),
        notes: z.string(),
        month: z.string(),
        year: z.string(),
        termName: z.string(),
        termId: z.string(),
        termSubjectGroupName: z.string(),
        termSubjectGroupId: z.string(),
        dueDate: z.string(),
        amount: z.string()
    })
});
export type FeeTemplateDataSchema = z.infer<typeof feeTemplateSchema>;

//To find all active students for Admin
export const findAllActiveStudentsForFeeCreationSchema = z.object({
    query: z.object({
        page: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional(),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional()
    })
});
export type FindAllActiveStudentsForFeeCreationSchema = z.infer<typeof findAllActiveStudentsForFeeCreationSchema>;
export const defaultSelectActiveStudentsForFeeCreationSchema = z.object({
    query: z.object({
        page: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional(),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional()
    })
});
export type DefaultSelectActiveStudentsForFeeCreationSchema = z.infer<typeof defaultSelectActiveStudentsForFeeCreationSchema>;

export const searchActiveStudentsForfeeCreationSchema = z.object({
    query: z.object({
        search: z.string().optional(),
        page: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional(),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        termSubjectGroupId: z.string()
    })
});
export type SearchActiveStudentsForfeeCreationSchema = z.infer<typeof searchActiveStudentsForfeeCreationSchema>;
export const selectActiveStudentsForFeeCreationSchema = z.object({
    query: z.object({
        search: z.string().optional(),
        termSubjectGroupId: z.string().optional(),
        page: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional(),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional()
    })
});
export type SelectActiveStudentsForFeeCreationSchema = z.infer<typeof selectActiveStudentsForFeeCreationSchema>;

export const feeTemplateUndoSchema = z.object({
    params: z.object({
        feeTemplateId: z.string()
    })
});

export type FeeTemplateUndoSchema = z.infer<typeof feeTemplateUndoSchema>;

export const feeTemplateQueryByTermIdSchema = z.object({
    query: z.object({
        termId: z.string().min(1, 'Term ID is required')
    })
});

export type FeeTemplateQueryByTermIdSchema = z.infer<typeof feeTemplateQueryByTermIdSchema>;
