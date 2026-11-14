import { db } from '../../../utils/db.server';
import { customError } from '../../../utils/customError';
import { FeeTemplateDataSchema } from '../../../schema/admin.dto/admin.fee.dto/admin.fee.dto';
import { NotificationType, PaymentType } from '@prisma/client';
import { autoApplyCreditToFeePaymentInTransaction } from '../admin.student.service/admin.active.student.service/admin.active.student.service';
import { createManyNotificationsAndPush, getStudentNamesMap } from '../../notification.service/notification.service';
import { enrollmentHistoryTableExists } from '../admin.enrollment.history.service/enrollment.history.service';
import { SKIP_REASON_TEXT, decideInvoiceEligibility, parseBillingPeriod, periodWarning } from './fee.eligibility.rules';
import type { SkipCode } from './fee.eligibility.rules';

export type SkippedStudent = {
    studentId: number;
    akaalId: number | null;
    name: string;
    code: SkipCode;
    reason: string;
    evidence?: { leftOn?: string; reEnrolledOn?: string };
};

/**
 * Creates the monthly/term invoices for the selected students of ONE fee group.
 *
 * Issue 9 rules:
 *  - A student is billed only with a live subject enrolment in the fee group (at least one subject of the group; leaving
 *    one subject but staying in another keeps the group fee unchanged). The fee record alone (StudentTermFee) is not proof
 *    of enrolment: de-enrolling keeps it so fee history survives.
 *  - When a de-enrolment history record exists, a billing period that falls inside a proven gap (left before the period,
 *    enrolled again only after it) is skipped too. Older de-enrolments have no date; they are reported, never guessed.
 *  - One unusable student never fails the batch: each is skipped with a reason, and the result lists who was created and
 *    who was skipped. Everything else is still one transaction (a real database error rolls the whole batch back).
 *  - An invoice that already exists for a student under the same template is skipped (never duplicated); the template is
 *    locked per fee group + invoice name so two simultaneous requests cannot both bill the same student.
 *  - Only students who really got an invoice are notified, after the transaction has committed.
 *  - The amount, the fee-group rules and the billing-period/backdating behaviour are unchanged. The month/year the browser
 *    sends are validated here, and a billing period that is not the current month is reported as a warning (not blocked).
 */
export async function createFeeTemplateAndPayments(feeTemplateData: FeeTemplateDataSchema['body']) {
    const { studentIds, month, year, termId, termSubjectGroupId, dueDate, amount, termName, termSubjectGroupName, interval, notes, invoiceName } = feeTemplateData;
    console.info('[admin.fee] createFeeTemplateAndPayments:start', {
        studentCount: studentIds.length,
        termId,
        termSubjectGroupId,
        invoiceName,
        interval,
        dueDate
    });

    // ---- server-side validation of what the browser sent
    const parsed = parseBillingPeriod(month, year);
    if (!parsed.ok) throw customError(parsed.error, 'fail', 400, true);
    const dueDateValue = new Date(dueDate);
    if (Number.isNaN(dueDateValue.getTime())) throw customError('The due date is not a valid date.', 'fail', 400, true);
    const groupId = Number(termSubjectGroupId);
    const termIdNumber = Number(termId);
    const amountNumber = Number(amount);
    if (!Number.isInteger(groupId) || !Number.isInteger(termIdNumber)) throw customError('The term and fee group must be whole numbers.', 'fail', 400, true);
    if (!Number.isInteger(amountNumber) || amountNumber < 0) throw customError('The invoice amount must be a whole number of dollars.', 'fail', 400, true);
    const requestedIds = studentIds.map((id) => Number(id));
    if (requestedIds.length === 0 || !requestedIds.every((id) => Number.isInteger(id) && id > 0)) throw customError('Select at least one student (student ids must be whole numbers).', 'fail', 400, true);
    const uniqueIds = Array.from(new Set(requestedIds));
    const billingPeriod = parsed.period;
    const warning = periodWarning(billingPeriod);
    const paymentInterval = interval === 'MONTHLY' ? PaymentType.MONTHLY : PaymentType.TERM;
    // De-enrolment history only exists once the Issue 10 migration has been applied. Without it the live-enrolment rule still protects billing.
    const historyAvailable = await enrollmentHistoryTableExists();
    if (!historyAvailable) console.warn('[admin.fee] EnrollmentHistory table not found: invoices are checked against live enrolments only');

    const outcome = await db.$transaction(
        async (prisma) => {
            // One generation per fee group + invoice name at a time: a second, simultaneous request waits here and then
            // sees the invoices of the first as "already billed" instead of creating them again.
            await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`fee-template:${groupId}:${invoiceName}`}))`;

            let templateCreated = false;
            let feeTemplate = await prisma.feeTemplate.findFirst({
                where: { termSubjectGroupId: groupId, invoiceName, interval: paymentInterval }
            });
            if (!feeTemplate) {
                const existingInvoice = await prisma.feeTemplate.findFirst({ where: { invoiceName } });
                if (existingInvoice) {
                    throw customError(`A FeeTemplate with invoice name '${invoiceName}' already exists`, 'fail', 400, true);
                }
                feeTemplate = await prisma.feeTemplate.create({
                    data: {
                        groupName: termSubjectGroupName,
                        month,
                        year,
                        termName,
                        termId: termIdNumber,
                        termSubjectGroupId: groupId,
                        amount: amountNumber,
                        dueDate: dueDateValue,
                        interval: paymentInterval,
                        invoiceName,
                        notes
                    }
                });
                templateCreated = true;
            }

            // Everything needed to decide, loaded once for the whole batch.
            const [students, studentTermFees, liveEnrollments, historyRows] = await Promise.all([
                prisma.student.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, akaalId: true, personalDetails: { select: { firstName: true, lastName: true } } } }),
                prisma.studentTermFee.findMany({ where: { studentId: { in: uniqueIds }, termId: termIdNumber, termSubjectGroupId: groupId }, select: { id: true, studentId: true } }),
                prisma.enrollment.findMany({ where: { studentId: { in: uniqueIds }, termSubjectGroupId: groupId }, select: { studentId: true, createdAt: true } }),
                historyAvailable
                    ? prisma.enrollmentHistory.findMany({ where: { studentId: { in: uniqueIds }, termSubjectGroupId: groupId }, select: { studentId: true, enrolledAt: true, endedAt: true, subjectName: true } })
                    : Promise.resolve([] as { studentId: number; enrolledAt: Date | null; endedAt: Date; subjectName: string }[])
            ]);
            const alreadyBilled = await prisma.feePayment.findMany({
                where: { feeTemplateId: feeTemplate.id, studentTermFeeId: { in: studentTermFees.map((fee) => fee.id) } },
                select: { studentTermFeeId: true }
            });
            const studentById = new Map(students.map((student) => [student.id, student] as const));
            const feeByStudent = new Map(studentTermFees.map((fee) => [fee.studentId, fee] as const));
            const billedFeeIds = new Set(alreadyBilled.map((payment) => payment.studentTermFeeId));

            const skipped: SkippedStudent[] = [];
            const created: { id: number; studentId: number }[] = [];
            const skip = (studentId: number, code: SkipCode, reason: string, evidence?: SkippedStudent['evidence']) => {
                const student = studentById.get(studentId);
                const name = `${student?.personalDetails?.firstName ?? ''} ${student?.personalDetails?.lastName ?? ''}`.trim();
                skipped.push({ studentId, akaalId: student?.akaalId ?? null, name: name || `Student ${studentId}`, code, reason, ...(evidence ? { evidence } : {}) });
            };

            for (const studentId of uniqueIds) {
                const student = studentById.get(studentId);
                if (!student) {
                    skip(studentId, 'STUDENT_NOT_FOUND', SKIP_REASON_TEXT.STUDENT_NOT_FOUND);
                    continue;
                }
                const studentTermFee = feeByStudent.get(studentId);
                if (!studentTermFee) {
                    skip(studentId, 'NO_FEE_RECORD', SKIP_REASON_TEXT.NO_FEE_RECORD);
                    continue;
                }
                const decision = decideInvoiceEligibility({
                    live: liveEnrollments.filter((enrollment) => enrollment.studentId === studentId),
                    history: historyRows.filter((row) => row.studentId === studentId),
                    period: billingPeriod
                });
                if (!decision.eligible) {
                    console.warn('[admin.fee] skipping ineligible student', { studentId, akaalId: student.akaalId, termSubjectGroupId: groupId, code: decision.code });
                    skip(studentId, decision.code, decision.reason, decision.evidence);
                    continue;
                }
                if (student.akaalId === null) {
                    skip(studentId, 'NO_AKAAL_ID', SKIP_REASON_TEXT.NO_AKAAL_ID);
                    continue;
                }
                if (billedFeeIds.has(studentTermFee.id)) {
                    skip(studentId, 'ALREADY_BILLED', SKIP_REASON_TEXT.ALREADY_BILLED);
                    continue;
                }
                const invoiceId = `${student.akaalId}${groupId}${String(parsed.monthNumber).padStart(2, '0')}`;
                const payment = await prisma.feePayment.create({
                    data: {
                        invoiceId,
                        studentTermFeeId: studentTermFee.id,
                        feeTemplateId: feeTemplate.id,
                        dueDate: dueDateValue,
                        dueAmount: amountNumber,
                        status: 'PENDING',
                        feeAmount: amountNumber,
                        adjustedFeeAmount: amountNumber
                    }
                });
                created.push({ id: payment.id, studentId });
            }

            // Nobody was billed and this call made the template: do not leave an empty template behind.
            if (created.length === 0 && templateCreated) {
                await prisma.feeTemplate.delete({ where: { id: feeTemplate.id } });
                return { feeTemplate: null, created, skipped };
            }
            // AUTO-CREDIT DISABLED (2026-06): credit must no longer be auto-applied on invoice creation.
            // May & June invoices silently spent students' creditBalance. Credit is now applied manually only
            // via PATCH /api/v1/apply-credit-balance-to-student-feePayment-by-id. See docs/gotchas.md.
            return { feeTemplate, created, skipped };
        },
        { timeout: 120000, maxWait: 10000 }
    );

    // Notify ONLY students who really got an invoice, and only after the transaction has committed.
    if (outcome.created.length > 0) {
        try {
            const notifiedIds = outcome.created.map((entry) => entry.studentId);
            const feeNames = await getStudentNamesMap(notifiedIds);
            await createManyNotificationsAndPush(
                notifiedIds.map((studentId) => ({
                    studentId,
                    type: NotificationType.FEE,
                    content: `${feeNames.get(studentId) ?? 'Student'}, you have a new fee invoice. Please check your fee details.`,
                    actionUrl: `/student/fee-list?studentId=${studentId}`
                }))
            );
        } catch (error) {
            // The invoices are saved; a notification problem must not turn that into a failure.
            console.error('[admin.fee] invoice notifications failed', error);
        }
    }

    const legacySkippedDeEnrolled = outcome.skipped
        .filter((entry) => entry.code === 'LEFT_FEE_GROUP' || entry.code === 'NO_ENROLLMENT_NO_HISTORY' || entry.code === 'NOT_ENROLLED_IN_BILLING_PERIOD')
        .map((entry) => ({ studentId: entry.studentId, akaalId: entry.akaalId }));
    console.info('[admin.fee] createFeeTemplateAndPayments:done', { requested: uniqueIds.length, created: outcome.created.length, skipped: outcome.skipped.length });
    return {
        message: outcome.created.length > 0 ? 'FeeTemplate and FeePayments created successfully.' : 'No invoices were created.',
        feeTemplate: outcome.feeTemplate,
        feePayments: outcome.created,
        requestedCount: uniqueIds.length,
        createdCount: outcome.created.length,
        skippedCount: outcome.skipped.length,
        skipped: outcome.skipped,
        skippedDeEnrolled: legacySkippedDeEnrolled,
        billingPeriod: { label: billingPeriod.label, month: parsed.monthNumber, year: parsed.year },
        periodWarning: warning,
        historyAvailable
    };
}
// undoCreateFeeTemplateAndPayments(18)

export async function undoCreateFeeTemplateAndPayments(feeTemplateId: number) {
    return db.$transaction(async (prisma) => {
        // First, find all FeePayments associated with the FeeTemplate
        const feePayments = await prisma.feePayment.findMany({
            where: { feeTemplateId: feeTemplateId },
            include: { paymentInstallment: true } // Include PaymentInstallments to check and delete them
        });

        // Delete PaymentInstallments for each FeePayment
        for (const feePayment of feePayments) {
            await prisma.paymentInstallment.deleteMany({
                where: { feePaymentId: feePayment.id }
            });
        }

        // Now, delete FeePayments after all related PaymentInstallments are removed
        await prisma.feePayment.deleteMany({
            where: { feeTemplateId: feeTemplateId }
        });

        // Finally, delete the FeeTemplate itself
        await prisma.feeTemplate.delete({
            where: { id: feeTemplateId }
        });

        return { message: 'FeeTemplate and related FeePayments and PaymentInstallments successfully deleted.' };
    });
}

export const findAllCurrentTermSubjectGroups = async () => {
    return db.termSubjectGroup.findMany({
        where: {
            term: {
                currentTerm: true
            }
        },
        include: {
            term: true,
            fee: true,
            subject: true,
            subjectGroup: {
                select: {
                    groupName: true
                }
            }
        }
    });
};

export async function findActiveStudentsForFeeCreation(page: number, termId: number) {
    const take = 10;
    const pageNum = page ?? 0;
    const skip = pageNum * take;

    const activeStudents = await db.student.findMany({
        where: {
            role: 'STUDENT',
            isActive: true,
            studentTermFee: {
                some: {
                    termId: +termId
                }
            },
            // Same rule as invoice generation: de-enrolling keeps the fee record, so also require a live enrolment this term.
            enrollments: { some: { termSubjectGroup: { termId: +termId } } }
        },
        skip,
        take,
        orderBy: {
            akaalId: 'asc'
        },
        select: {
            id: true,
            akaalId: true,
            role: true,
            termAttendance: true,
            attendancePercentageValue: true,
            isActive: true,
            updatedAt: true,
            createdAt: true,
            personalDetails: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    DOB: true,
                    gender: true,
                    email: true,
                    contact: true,
                    address: true,
                    suburb: true,
                    state: true,
                    country: true,
                    postcode: true,
                    image: true
                }
            },
            parentsDetails: {
                select: {
                    id: true,
                    fatherName: true,
                    motherName: true,
                    parentEmail: true,
                    parentContact: true
                }
            },
            emergencyContact: {
                select: {
                    id: true,
                    contactPerson: true,
                    contactNumber: true,
                    relationship: true
                }
            },
            healthInformation: {
                select: {
                    id: true,
                    medicareNumber: true,
                    ambulanceMembershipNumber: true,
                    medicalCondition: true,
                    allergy: true
                }
            },
            subjectRelated: true,
            subjectsChosen: true,
            otherInformation: {
                select: {
                    id: true,
                    otherInfo: true,
                    declaration: true
                }
            },
            skipReport: {
                select: {
                    isClosed: true
                }
            },
            schoolCheckInAttendance: {
                orderBy: {
                    date: 'desc'
                },
                take: 3
            },
            studentTermFee: {
                where: {
                    termId: +termId
                },
                select: {
                    termSubjectGroup: {
                        select: {
                            id: true,
                            subject: true,
                            subjectGroup: true,
                            fee: {
                                select: {
                                    amount: true,
                                    paymentType: true
                                }
                            }
                        }
                    }
                }
            },
            enrollments: {
                where: {
                    subjectEnrollment: {
                        termSubject: {
                            termId: +termId
                        }
                    }
                },
                select: {
                    subjectEnrollment: {
                        select: {
                            termSubject: {
                                select: {
                                    subject: {
                                        select: {
                                            name: true,
                                            id: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    const count = await db.student.count({
        where: {
            role: 'STUDENT',
            isActive: true,
            studentTermFee: {
                some: {
                    termId: +termId
                }
            },
            // Same rule as invoice generation: de-enrolling keeps the fee record, so also require a live enrolment this term.
            enrollments: { some: { termSubjectGroup: { termId: +termId } } }
        }
    });

    return { activeStudents, count };
}

export async function defaultSelectActiveStudentsForFeeCreation(page: number, termId: number) {
    const activeStudents = await db.student.findMany({
        where: {
            role: 'STUDENT',
            isActive: true,
            studentTermFee: {
                some: {
                    termId: +termId
                }
            },
            // Same rule as invoice generation: de-enrolling keeps the fee record, so also require a live enrolment this term.
            enrollments: { some: { termSubjectGroup: { termId: +termId } } }
        },
        orderBy: {
            akaalId: 'desc'
        },
        select: {
            id: true,
            akaalId: true,
            role: true,
            isActive: true,
            personalDetails: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    DOB: true,
                    gender: true,
                    email: true,
                    contact: true,
                    address: true,
                    suburb: true,
                    state: true,
                    country: true,
                    postcode: true,
                    image: true
                }
            }
        }
    });

    const count = await db.student.count({
        where: {
            role: 'STUDENT',
            isActive: true,
            studentTermFee: {
                some: {
                    termId: +termId
                }
            },
            // Same rule as invoice generation: de-enrolling keeps the fee record, so also require a live enrolment this term.
            enrollments: { some: { termSubjectGroup: { termId: +termId } } }
        }
    });

    return { activeStudents, count };
}
export async function searchActiveStudentsForFeeCreation(search = '', page: number, termId: number, termSubjectGroupId = 999) {
    const take = 10;
    const searchAsNumber = isNaN(Number(search)) ? undefined : parseInt(search);
    const termFeeFilter =
        termSubjectGroupId === 999 ? { termId: +termId } : { termId: +termId, termSubjectGroupId: +termSubjectGroupId };
    // De-enrolling deliberately keeps StudentTermFee so fee history and outstanding dues
    // survive. That means selecting on StudentTermFee alone kept offering de-enrolled
    // students for NEW invoices indefinitely — a student removed from kirtan in June was
    // still billed for kirtan in July. Require a live enrollment as well.
    const enrollmentFilter =
        termSubjectGroupId === 999
            ? { some: { termSubjectGroup: { termId: +termId } } }
            : { some: { termSubjectGroupId: +termSubjectGroupId } };
    console.info('[admin.fee] searchActiveStudentsForFeeCreation', {
        search,
        page,
        termId,
        termSubjectGroupId
    });
    if (searchAsNumber) {
        const pageNum: number = page ?? 0;
        const skip = pageNum * take;

        const activeStudents = await db.student.findMany({
            skip,
            take,
            orderBy: {
                akaalId: 'asc'
            },
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    some: {
                        ...termFeeFilter
                    }
                },
                enrollments: enrollmentFilter,

                OR: [
                    { akaalId: searchAsNumber },
                    {
                        personalDetails: {
                            OR: [
                                { firstName: { contains: search, mode: 'insensitive' } },
                                { lastName: { contains: search, mode: 'insensitive' } },
                                { email: { contains: search, mode: 'insensitive' } },
                                { contact: { contains: search, mode: 'insensitive' } },
                                { postcode: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    },
                    {
                        parentsDetails: {
                            OR: [
                                { fatherName: { contains: search, mode: 'insensitive' } },
                                { motherName: { contains: search, mode: 'insensitive' } },
                                { parentEmail: { contains: search, mode: 'insensitive' } },
                                { parentContact: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    }
                ]
            },
            select: {
                id: true,
                akaalId: true,
                role: true,
                isActive: true,
                updatedAt: true,
                createdAt: true,
                termAttendance: true,
                attendancePercentageValue: true,
                personalDetails: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        DOB: true,
                        gender: true,
                        email: true,
                        contact: true,
                        address: true,
                        suburb: true,
                        state: true,
                        country: true,
                        postcode: true,
                        image: true
                    }
                },
                parentsDetails: {
                    select: {
                        id: true,
                        fatherName: true,
                        motherName: true,
                        parentEmail: true,
                        parentContact: true
                    }
                },
                emergencyContact: {
                    select: {
                        id: true,
                        contactPerson: true,
                        contactNumber: true,
                        relationship: true
                    }
                },
                healthInformation: {
                    select: {
                        id: true,
                        medicareNumber: true,
                        ambulanceMembershipNumber: true,
                        medicalCondition: true,
                        allergy: true
                    }
                },
                subjectRelated: true,
                subjectsChosen: true,
                otherInformation: {
                    select: {
                        id: true,
                        otherInfo: true,
                        declaration: true
                    }
                },
                skipReport: {
                    select: {
                        isClosed: true
                    }
                },
                schoolCheckInAttendance: {
                    orderBy: {
                        date: 'desc'
                    },
                    take: 3
                },
                studentTermFee: {
                    where: {
                        termId: +termId
                    },
                    select: {
                        termSubjectGroup: {
                            select: {
                                id: true,
                                subject: true,
                                subjectGroup: true,
                                fee: {
                                    select: {
                                        amount: true,
                                        paymentType: true
                                    }
                                }
                            }
                        }
                    }
                },
                enrollments: {
                    select: {
                        subjectEnrollment: {
                            select: {
                                termSubject: {
                                    select: {
                                        subject: {
                                            select: {
                                                id: true,
                                                name: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        const count = await db.student.count({
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    some: {
                        ...termFeeFilter
                    }
                },
                enrollments: enrollmentFilter,

                OR: [
                    { akaalId: searchAsNumber },
                    {
                        personalDetails: {
                            OR: [
                                { firstName: { contains: search, mode: 'insensitive' } },
                                { lastName: { contains: search, mode: 'insensitive' } },
                                { email: { contains: search, mode: 'insensitive' } },
                                { contact: { contains: search, mode: 'insensitive' } },
                                { postcode: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    },
                    {
                        parentsDetails: {
                            OR: [
                                { fatherName: { contains: search, mode: 'insensitive' } },
                                { motherName: { contains: search, mode: 'insensitive' } },
                                { parentEmail: { contains: search, mode: 'insensitive' } },
                                { parentContact: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    }
                ]
            }
        });
        return { activeStudents, count };
    } else if (!searchAsNumber) {
        const pageNum: number = page ?? 0;
        const skip = pageNum * take;
        const activeStudents = await db.student.findMany({
            skip,
            take,
            orderBy: {
                akaalId: 'asc'
            },
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    some: {
                        ...termFeeFilter
                    }
                },
                enrollments: enrollmentFilter,

                OR: [
                    {
                        personalDetails: {
                            OR: [
                                { firstName: { contains: search, mode: 'insensitive' } },
                                { lastName: { contains: search, mode: 'insensitive' } },
                                { email: { contains: search, mode: 'insensitive' } },
                                { contact: { contains: search, mode: 'insensitive' } },
                                { postcode: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    },
                    {
                        parentsDetails: {
                            OR: [
                                { fatherName: { contains: search, mode: 'insensitive' } },
                                { motherName: { contains: search, mode: 'insensitive' } },
                                { parentEmail: { contains: search, mode: 'insensitive' } },
                                { parentContact: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    }
                ]
            },
            select: {
                id: true,
                akaalId: true,
                role: true,
                isActive: true,
                updatedAt: true,
                createdAt: true,
                termAttendance: true,
                attendancePercentageValue: true,
                personalDetails: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        DOB: true,
                        gender: true,
                        email: true,
                        contact: true,
                        address: true,
                        suburb: true,
                        state: true,
                        country: true,
                        postcode: true,
                        image: true
                    }
                },
                parentsDetails: {
                    select: {
                        id: true,
                        fatherName: true,
                        motherName: true,
                        parentEmail: true,
                        parentContact: true
                    }
                },
                emergencyContact: {
                    select: {
                        id: true,
                        contactPerson: true,
                        contactNumber: true,
                        relationship: true
                    }
                },
                healthInformation: {
                    select: {
                        id: true,
                        medicareNumber: true,
                        ambulanceMembershipNumber: true,
                        medicalCondition: true,
                        allergy: true
                    }
                },
                subjectRelated: true,
                subjectsChosen: true,
                otherInformation: {
                    select: {
                        id: true,
                        otherInfo: true,
                        declaration: true
                    }
                },
                skipReport: {
                    select: {
                        isClosed: true
                    }
                },
                schoolCheckInAttendance: {
                    orderBy: {
                        date: 'desc'
                    },
                    take: 3
                },
                studentTermFee: {
                    where: {
                        termId: +termId
                    },
                    select: {
                        termSubjectGroup: {
                            select: {
                                id: true,
                                subject: true,
                                subjectGroup: true,
                                fee: {
                                    select: {
                                        amount: true,
                                        paymentType: true
                                    }
                                }
                            }
                        }
                    }
                },
                enrollments: {
                    select: {
                        subjectEnrollment: {
                            select: {
                                termSubject: {
                                    select: {
                                        subject: {
                                            select: {
                                                name: true,
                                                id: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        const count = await db.student.count({
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    some: {
                        ...termFeeFilter
                    }
                },
                enrollments: enrollmentFilter,

                OR: [
                    {
                        personalDetails: {
                            OR: [
                                { firstName: { contains: search, mode: 'insensitive' } },
                                { lastName: { contains: search, mode: 'insensitive' } },
                                { email: { contains: search, mode: 'insensitive' } },
                                { contact: { contains: search, mode: 'insensitive' } },
                                { postcode: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    },
                    {
                        parentsDetails: {
                            OR: [
                                { fatherName: { contains: search, mode: 'insensitive' } },
                                { motherName: { contains: search, mode: 'insensitive' } },
                                { parentEmail: { contains: search, mode: 'insensitive' } },
                                { parentContact: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    }
                ]
            }
        });
        return { activeStudents, count };
    }
}
export async function selectActiveStudentsForFeeCreation(search = '', page: number, termId: number, termSubjectGroupId: number) {
    const searchAsNumber = isNaN(Number(search)) ? undefined : parseInt(search);
    const termFeeFilter =
        termSubjectGroupId === 999 ? { termId: +termId } : { termId: +termId, termSubjectGroupId: +termSubjectGroupId };
    // De-enrolling deliberately keeps StudentTermFee so fee history and outstanding dues
    // survive. That means selecting on StudentTermFee alone kept offering de-enrolled
    // students for NEW invoices indefinitely — a student removed from kirtan in June was
    // still billed for kirtan in July. Require a live enrollment as well.
    const enrollmentFilter =
        termSubjectGroupId === 999
            ? { some: { termSubjectGroup: { termId: +termId } } }
            : { some: { termSubjectGroupId: +termSubjectGroupId } };
    console.info('[admin.fee] selectActiveStudentsForFeeCreation', {
        search,
        page,
        termId,
        termSubjectGroupId
    });

    if (searchAsNumber) {
        const activeStudents = await db.student.findMany({
            orderBy: {
                akaalId: 'asc'
            },
            where: {
                role: 'STUDENT',
                isActive: true,

                studentTermFee: {
                    some: {
                        ...termFeeFilter
                    }
                },
                enrollments: enrollmentFilter,

                OR: [
                    { akaalId: searchAsNumber },
                    {
                        personalDetails: {
                            OR: [
                                { firstName: { contains: search, mode: 'insensitive' } },
                                { lastName: { contains: search, mode: 'insensitive' } },
                                { email: { contains: search, mode: 'insensitive' } },
                                { contact: { contains: search, mode: 'insensitive' } },
                                { postcode: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    },
                    {
                        parentsDetails: {
                            OR: [
                                { fatherName: { contains: search, mode: 'insensitive' } },
                                { motherName: { contains: search, mode: 'insensitive' } },
                                { parentEmail: { contains: search, mode: 'insensitive' } },
                                { parentContact: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    }
                ]
            },
            select: {
                id: true,
                akaalId: true,
                role: true,
                isActive: true,

                personalDetails: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        DOB: true,
                        gender: true,
                        email: true,
                        contact: true,
                        address: true,
                        suburb: true,
                        state: true,
                        country: true,
                        postcode: true,
                        image: true
                    }
                }
            }
        });
        const count = await db.student.count({
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    some: {
                        ...termFeeFilter
                    }
                },
                enrollments: enrollmentFilter,

                OR: [
                    { akaalId: searchAsNumber },
                    {
                        personalDetails: {
                            OR: [
                                { firstName: { contains: search, mode: 'insensitive' } },
                                { lastName: { contains: search, mode: 'insensitive' } },
                                { email: { contains: search, mode: 'insensitive' } },
                                { contact: { contains: search, mode: 'insensitive' } },
                                { postcode: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    },
                    {
                        parentsDetails: {
                            OR: [
                                { fatherName: { contains: search, mode: 'insensitive' } },
                                { motherName: { contains: search, mode: 'insensitive' } },
                                { parentEmail: { contains: search, mode: 'insensitive' } },
                                { parentContact: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    }
                ]
            }
        });
        return { activeStudents, count };
    } else if (!searchAsNumber) {
        const activeStudents = await db.student.findMany({
            orderBy: {
                akaalId: 'asc'
            },
            where: {
                role: 'STUDENT',
                isActive: true,

                studentTermFee: {
                    some: {
                        ...termFeeFilter
                    }
                },
                enrollments: enrollmentFilter,

                OR: [
                    {
                        personalDetails: {
                            OR: [
                                { firstName: { contains: search, mode: 'insensitive' } },
                                { lastName: { contains: search, mode: 'insensitive' } },
                                { email: { contains: search, mode: 'insensitive' } },
                                { contact: { contains: search, mode: 'insensitive' } },
                                { postcode: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    },
                    {
                        parentsDetails: {
                            OR: [
                                { fatherName: { contains: search, mode: 'insensitive' } },
                                { motherName: { contains: search, mode: 'insensitive' } },
                                { parentEmail: { contains: search, mode: 'insensitive' } },
                                { parentContact: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    }
                ]
            },
            select: {
                id: true,
                akaalId: true,
                role: true,
                isActive: true,

                personalDetails: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        DOB: true,
                        gender: true,
                        email: true,
                        contact: true,
                        address: true,
                        suburb: true,
                        state: true,
                        country: true,
                        postcode: true,
                        image: true
                    }
                }
            }
        });
        const count = await db.student.count({
            where: {
                role: 'STUDENT',
                isActive: true,

                studentTermFee: {
                    some: {
                        ...termFeeFilter
                    }
                },
                enrollments: enrollmentFilter,

                OR: [
                    {
                        personalDetails: {
                            OR: [
                                { firstName: { contains: search, mode: 'insensitive' } },
                                { lastName: { contains: search, mode: 'insensitive' } },
                                { email: { contains: search, mode: 'insensitive' } },
                                { contact: { contains: search, mode: 'insensitive' } },
                                { postcode: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    },
                    {
                        parentsDetails: {
                            OR: [
                                { fatherName: { contains: search, mode: 'insensitive' } },
                                { motherName: { contains: search, mode: 'insensitive' } },
                                { parentEmail: { contains: search, mode: 'insensitive' } },
                                { parentContact: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    }
                ]
            }
        });
        return { activeStudents, count };
    }
}

export async function fetchFeeTemplatesByTerm(termId: number) {
    return db.feeTemplate.findMany({
        where: {
            termId: termId
        },
        include: {
            feePayments: true // Optionally include related feePayments if needed
        }
    });
}
