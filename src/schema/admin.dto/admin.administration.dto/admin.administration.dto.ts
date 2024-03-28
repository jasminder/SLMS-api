import { z } from 'zod';

export const findUniqueTermSchema = z.object({
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FindUniqueTermSchema = z.infer<typeof findUniqueTermSchema>;

export const findAllStudentsInATermSchema = z.object({
    query: z.object({
        page: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional()
    })
});
export type FindAllStudentsInATermSchema = z.infer<typeof findAllStudentsInATermSchema>;

export const createNewTermSetupSchema = z.object({
    body: z.object({
        termName: z.string().min(4, { message: 'Minimum 4 characters required' }),
        startDate: z.string(),
        endDate: z.string(),
        groupSubjects: z.array(
            z.object({
                groupName: z.string().min(4, { message: 'Minimum 4 characters required' }),
                fee: z.string({ required_error: 'fee is required' }).regex(/^\d+$/, { message: 'Please enter a valid amount' }).min(1, { message: 'Please enter a fee' }),
                feeInterval: z.string().default('TERM'),
                subjects: z.array(
                    z.object({
                        subjectName: z.string().min(4, { message: 'Minimum 4 characters required' }),
                        levels: z.array(z.string()).min(1, { message: 'Minimum 4 characters required' })
                    })
                )
            })
        )
    })
});

export type CreateNewTermSetupSchema = z.infer<typeof createNewTermSetupSchema>;

const termSchema = z.object({
    id: z.number().optional(),
    isPublish: z.boolean(),
    currentTerm: z.boolean(),
    name: z.string(),
    startDate: z.string(), // Assuming dates are in ISO string format
    endDate: z.string(),
    createdAt: z.string(),
    updatedAt: z.string()
});
export type TermSchema = z.infer<typeof termSchema>;

export const createTermSchema = z.object({
    body: z.object({
        name: z.string(),
        startDate: z.string(),
        endDate: z.string()
    })
});
export type CreateTermSchema = z.infer<typeof createTermSchema>;

// const TermSubjectSchema = z.object({
//     id: z.number(),
//     termId: z.number(),
//     subjectId: z.number(),
//     levelId: z.number().optional(),
//     feeId: z.number().optional(),
//     term: termSchema,
//     subject: z.object({
//         id: z.number(),
//         name: z.string(),
//         isActive: z.boolean()
//     }),
//     level: z
//         .array(
//             z.object({
//                 id: z.number(),
//                 name: z.string()
//             })
//         )
//         .optional(),
//     fee: z
//         .object({
//             id: z.number(),
//             amount: z.number(),
//             paymentType: z.enum(['MONTHLY', 'TERM'])
//         })
//         .optional()
// });

// const TermSubjectsArraySchema = z.array(TermSubjectSchema);

// export type TermSubjectsArraySchema = z.infer<typeof TermSubjectsArraySchema>;

const levelSchema = z.object({
    id: z.number(),
    name: z.string()
});

const subjectLevelSchema = z.object({
    level: levelSchema
});

const feeSchema = z.object({
    id: z.number(),
    amount: z.number(),
    subjectId: z.number(),
    paymentType: z.enum(['MONTHLY', 'TERM'])
});

const subjectSchema = z.object({
    name: z.string(),
    fee: feeSchema,
    isActive: z.boolean(),
    id: z.number(),
    SubjectLevel: z.array(subjectLevelSchema)
});

const termSubjectSchema = z.object({
    subject: subjectSchema
});

export const changeCurrentTermNameSchema = z.object({
    body: z.object({
        updatedTerm: termSchema
    }),
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type ChangeCurrentTermNameSchema = z.infer<typeof changeCurrentTermNameSchema>;

export const extendCurrentTermSchema = z.object({
    body: z.object({
        updatedTerm: termSchema
    }),
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type ExtendCurrentTermSchema = z.infer<typeof extendCurrentTermSchema>;

export const changeIsOnSundaySchema = z.object({
    params: z.object({
        termSubjectId: z.string().min(1, 'Term Subject ID required')
    }),
    body: z.object({
        isOnSunday: z.boolean()
    })
});
export type ChangeIsOnSundaySchema = z.infer<typeof changeIsOnSundaySchema>;
export const changeIsOnWeekdaySchema = z.object({
    params: z.object({
        termSubjectId: z.string().min(1, 'Term Subject ID required')
    }),
    body: z.object({
        isOnWeekday: z.boolean()
    })
});
export type ChangeIsOnWeekdaySchema = z.infer<typeof changeIsOnWeekdaySchema>;
