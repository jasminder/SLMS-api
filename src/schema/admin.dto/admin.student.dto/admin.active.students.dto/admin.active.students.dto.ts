import { z } from 'zod';

// To find a student by ID
export const findUniqueActiveStudentSchema = z.object({
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    }),
    query: z.object({
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FindUniqueActiveStudentSchema = z.infer<typeof findUniqueActiveStudentSchema>;

export const findUniqueActiveStudentWithoutSubjectsSchema = z.object({
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FindUniqueActiveStudentWithoutSubjectsSchema = z.infer<typeof findUniqueActiveStudentWithoutSubjectsSchema>;

//To find all active students for Admin
export const findAllActiveStudentsSchema = z.object({
    query: z.object({
        page: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional(),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional()
    })
});
export type FindAllActiveStudentsSchema = z.infer<typeof findAllActiveStudentsSchema>;
export const defaultSelectActiveStudentsSchema = z.object({
    query: z.object({
        page: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional(),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional()
    })
});
export type DefaultSelectActiveStudentsSchema = z.infer<typeof defaultSelectActiveStudentsSchema>;

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
        attendanceOption: z.string().optional(),
        sort: z.string().optional().default('termAttendance'),
        sort_dir: z.string().optional().default('asc'),
        page: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional(),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional()
    })
});
export type SearchActiveStudentsSchema = z.infer<typeof searchActiveStudentsSchema>;
export const selectActiveStudentsSchema = z.object({
    query: z.object({
        search: z.string().optional(),
        subjectOption: z.string().optional(),
        levelOption: z.string().optional(),
        sectionOption: z.string().optional(),
        attendanceOption: z.string().optional(),
        sort: z.string().optional().default('previousTermAttendance'),
        sort_dir: z.string().optional().default('asc'),
        page: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional(),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional()
    })
});
export type SelectActiveStudentsSchema = z.infer<typeof selectActiveStudentsSchema>;

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
export const updateAmountPaidAtSchoolSchema = z.object({
    body: z.object({
        feePaymentId: z.string(),
        paidAmount: z.string(),
        paidDate: z.string(),
        paymentMethod: z.string(),
        paymentStatus: z.string().optional(),
        remarks: z.string(),
        receivedBy: z.string()
    })
});
export type UpdateAmountPaidAtSchoolSchema = z.infer<typeof updateAmountPaidAtSchoolSchema>;

export const updateAmountFeeDueSchema = z.object({
    body: z.object({
        feePaymentId: z.string(),
        newDueAmount: z.string(),
        discountReason: z.string(),
        status: z.string().optional()
    })
});
export type UpdateAmountFeeDueSchema = z.infer<typeof updateAmountFeeDueSchema>;

export const applyCreditSchema = z.object({
    body: z.object({
        feePaymentId: z.string(),
        creditToApply: z.string(),
        remarks: z.string()
    })
});

export type ApplyCreditDataSchema = z.infer<typeof applyCreditSchema>;

export const getPaymentsByFeePaymentIdSchema = z.object({
    params: z.object({
        feePaymentId: z.string().min(1)
    })
});
export type GetPaymentsByFeePaymentIdSchema = z.infer<typeof getPaymentsByFeePaymentIdSchema>;

export const updatePaymentInstallmentSchema = z.object({
    body: z.object({
        paymentInstallmentId: z.string().min(1, { message: 'Payment installment ID is required' }),
        paidAmount: z.string().min(1, { message: 'Paid amount is required' }),
        paidDate: z.string(),
        paymentMethod: z.string().min(1, { message: 'Payment method is required' }),
        remarks: z.string().default('No remarks'),
        receivedBy: z.string().min(1, { message: 'Received by is required' })
    })
});
export type UpdatePaymentInstallmentSchema = z.infer<typeof updatePaymentInstallmentSchema>;

export const fetchFeePaymentByIdForInvoiceSchema = z.object({
    params: z.object({
        feePaymentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FetchFeePaymentByIdForInvoiceSchema = z.infer<typeof fetchFeePaymentByIdForInvoiceSchema>;

/* find active subjects for active students*/
export const findActiveStudentEnrolledSubjectsSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FindActiveStudentEnrolledSubjectsSchema = z.infer<typeof findActiveStudentEnrolledSubjectsSchema>;

// find current term for assign classes to active students
export const findCurrentTermToAssignClassSchema = z.object({
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FindCurrentTermToAssignClassSchema = z.infer<typeof findCurrentTermToAssignClassSchema>;

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
    })
});
export type ManageClassSchema = z.infer<typeof manageClassSchema>;

/*Remove classes for students*/
export const deleteClassAssignmentSchema = z.object({
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type DeleteClassAssignmentSchema = z.infer<typeof deleteClassAssignmentSchema>;

// last two schoolattendanace
export const fetchRecentSchoolAttendanceSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Student ID is required' })
    })
});

export type FetchRecentSchoolAttendanceSchema = z.infer<typeof fetchRecentSchoolAttendanceSchema>;

export const createLeaveApplicationSchema = z.object({
    body: z.object({
        startDate: z.string(),
        endDate: z.string(),
        reason: z.string(),
        status: z.string(),
        comments: z.string()
    }),
    params: z.object({
        studentId: z.string().min(1),
        appliedById: z.string().min(1),
        appliedByRole: z.string().min(1)
    })
});
export type CreateLeaveApplicationSchema = z.infer<typeof createLeaveApplicationSchema>;

export const updateLeaveApplicationSchema = z.object({
    body: z.object({
        startDate: z.string(),
        endDate: z.string(),
        reason: z.string(),
        comments: z.string().optional(),
        status: z.string()
    }),
    params: z.object({
        leaveId: z.string().min(1),
        updatedById: z.string().min(1)
    })
});
export type UpdateLeaveApplicationSchema = z.infer<typeof updateLeaveApplicationSchema>;
export const deleteLeaveApplicationSchema = z.object({
    params: z.object({
        leaveId: z.string().min(1)
    })
});
export type DeleteLeaveApplicationSchema = z.infer<typeof deleteLeaveApplicationSchema>;
export const fetchLeavesForStudentSchema = z.object({
    params: z.object({
        studentId: z.string().min(1).transform(Number)
    })
});
export type FetchLeavesForStudentSchema = z.infer<typeof fetchLeavesForStudentSchema>;

export const findLeaveByIdSchema = z.object({
    params: z.object({
        leaveId: z.string().min(1).transform(Number)
    })
});
export type FindLeaveByIdSchema = z.infer<typeof findLeaveByIdSchema>;

export const findStudentAttendanceByIdSchema = z.object({
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    }),
    query: z.object({
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});

export type FindStudentAttendanceByIdSchema = z.infer<typeof findStudentAttendanceByIdSchema>;

export const alumniStudentByIdSchema = z.object({
    params: z.object({
        studentId: z.string()
    }),
    body: z.object({
        remarks: z.string().min(1, { message: 'Remarks cannot be empty' })
    })
});

export type AlumniStudentByIdSchema = z.infer<typeof alumniStudentByIdSchema>;

export const markPresentByEditSchoolCheckInAttendanceForStudentSchema = z.object({
    body: z.object({
        remarks: z.string().optional(),
        date: z.string()
    }),
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type MarkPresentByEditSchoolCheckInAttendanceForStudentSchema = z.infer<typeof markPresentByEditSchoolCheckInAttendanceForStudentSchema>;
export const markAbsentByEditSchoolCheckInAttendanceForStudentSchema = z.object({
    body: z.object({
        remarks: z.string().optional(),
        date: z.string()
    }),
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type MarkAbsentByEditSchoolCheckInAttendanceForStudentSchema = z.infer<typeof markAbsentByEditSchoolCheckInAttendanceForStudentSchema>;

export const updateStudentCreditBalanceSchema = z.object({
    body: z.object({
        amount: z.string()
    }),
    params: z.object({
        studentId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type UpdateStudentCreditBalanceSchema = z.infer<typeof updateStudentCreditBalanceSchema>;
