import { z } from 'zod';

// To find a student by ID
export const findUniqueActiveStudentSchema = z.object({
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FindUniqueActiveStudentSchema = z.infer<typeof findUniqueActiveStudentSchema>;

//To find all active students for Admin
export const findAllActiveStudentsSchema = z.object({
    query: z.object({
        page: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional(),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional()
    })
});
export type FindAllActiveStudentsSchema = z.infer<typeof findAllActiveStudentsSchema>;
export const findStudentFeeDetailsSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    }),
    query: z.object({
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FindStudentFeeDetailsSchemaSchema = z.infer<typeof findStudentFeeDetailsSchema>;

// search active students
export const searchActiveStudentsSchema = z.object({
    query: z.object({
        search: z.string().optional(),
        subjectOption: z.string().optional(),
        levelOption: z.string().optional(),
        sectionOption: z.string().optional(),
        page: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional(),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional()
    })
});
export type SearchActiveStudentsSchema = z.infer<typeof searchActiveStudentsSchema>;

/* enroll activeStudent to subjects */
export const activeStudentEnrollDataSchema = z.object({
    body: z.object({
        activeStudentId: z.number(),
        enrollData: z.array(
            z.object({
                subject: z.string(),
                termSubjectGroupId: z.number(),
                subjectGroupId: z.number(),
                termId: z.number(),
                feeId: z.number(),
                termSubjectId: z.number()
            })
        )
    })
});
export type ActiveStudentEnrollDataSchema = z.infer<typeof activeStudentEnrollDataSchema>;
export const findTermSubjectGroupIdEnrolledSubjectsSchema = z.object({
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    }),
    query: z.object({
        termSubjectGroupId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FindTermSubjectGroupIdEnrolledSubjectsSchema = z.infer<typeof findTermSubjectGroupIdEnrolledSubjectsSchema>;

/*find unique feepayment details*/
export const findUniqueFeePaymentSchema = z.object({
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FindUniqueFeePaymentSchema = z.infer<typeof findUniqueFeePaymentSchema>;

/*update fee - amount paid made by the admin*/
export const updateAmountPaidSchema = z.object({
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    }),
    query: z.object({
        amountPaid: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    }),
    body: z.object({
        remarks: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type UpdateAmountPaidSchema = z.infer<typeof updateAmountPaidSchema>;

/* find active subjects for active students*/
export const findActiveStudentEnrolledSubjectsSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FindActiveStudentEnrolledSubjectsSchema = z.infer<typeof findActiveStudentEnrolledSubjectsSchema>;

/****** * assign class to student*****/
export const assignClassToStudentSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    }),
    body: z.object({
        subjectName: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        levelName: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        sectionName: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type AssignClassToStudentSchema = z.infer<typeof assignClassToStudentSchema>;

/*Manage classes for students*/
export const manageClassSchema = z.object({
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    }),
});
export type ManageClassSchema = z.infer<typeof manageClassSchema>;
