import { db } from '../../../utils/db.server';
import { customError } from '../../../utils/customError';
import { FeeTemplateDataSchema } from '../../../schema/admin.dto/admin.fee.dto/admin.fee.dto';
import { NotificationType, PaymentType } from '@prisma/client';
import { autoApplyCreditToFeePaymentInTransaction } from '../admin.student.service/admin.active.student.service/admin.active.student.service';
import { createManyNotificationsAndPush, getStudentNamesMap } from '../../notification.service/notification.service';

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

    // Execute all operations in a transaction
    return db.$transaction(async (prisma) => {
        // Parse the dueDate and set it to the start of the day for comparison
        const startDate = new Date(dueDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dueDate);
        endDate.setHours(23, 59, 59, 999);
        // Check if a FeeTemplate with the same dueDate, termSubjectGroupId, and interval already exists
        let feeTemplate = await prisma.feeTemplate.findFirst({
            where: {
                termSubjectGroupId: +termSubjectGroupId,
                // dueDate: {
                //     gte: startDate,
                //     lte: endDate
                // },
                invoiceName,
                interval: interval === 'MONTHLY' ? PaymentType.MONTHLY : PaymentType.TERM
            }
        });
        if (feeTemplate) {
            // Check for existing FeePayment records for the provided studentIds
            const existingFeePayments = await prisma.feePayment.findMany({
                where: {
                    feeTemplateId: feeTemplate.id,
                    studentTermFee: {
                        studentId: {
                            in: studentIds.map((id) => parseInt(id))
                        }
                    }
                },
                select: {
                    studentTermFee: {
                        select: {
                            studentId: true
                        }
                    }
                }
            });
            if (existingFeePayments.length > 0) {
                // Extract studentIds from existing payments
                const existingStudentIds = existingFeePayments.map((fp) => fp.studentTermFee?.studentId);
                throw customError(`Fee payments already exist for these student IDs under the specified fee template: ${existingStudentIds.join(', ')}`, 'fail', 400, true);
            }
            const feePayments = await Promise.all(
                studentIds
                    .map(async (studentId) => {
                        const student = await prisma.student.findUnique({ where: { id: parseInt(studentId) }, include: { personalDetails: { select: { firstName: true } } } });
                        if (!student) return null; // Continue if no student is found

                        const studentTermFee = await prisma.studentTermFee.findFirst({
                            where: { studentId: +studentId, termId: +termId, termSubjectGroupId: +termSubjectGroupId }
                        });

                        if (!studentTermFee) {
                            // Throw an error if the student is not enrolled in the specified term subject group
                            throw new Error(`Student with ID ${studentId} is not enrolled in the specified term subject group: ${termSubjectGroupName}`);
                        }

                        const monthNumber = (new Date(`${month} 1, ${year}`).getMonth() + 1).toString().padStart(2, '0');
                        const invoiceId = `${student.akaalId}${termSubjectGroupId}${monthNumber}`;

                        return prisma.feePayment.create({
                            data: {
                                invoiceId,
                                studentTermFeeId: studentTermFee.id,
                                feeTemplateId: feeTemplate?.id,
                                dueDate: new Date(dueDate),
                                dueAmount: +amount,
                                status: 'PENDING',
                                feeAmount: +amount,
                                adjustedFeeAmount: +amount
                            }
                        });
                    })
                    .filter((task) => task !== null)
            ); // Filter out null tasks
            for (const fp of feePayments) {
                if (fp) await autoApplyCreditToFeePaymentInTransaction(prisma, fp.id);
            }
            const feeNames = await getStudentNamesMap(studentIds.map(Number));
            await createManyNotificationsAndPush(
                studentIds.map((studentId) => ({
                    studentId: +studentId,
                    type: NotificationType.FEE,
                    content: `${feeNames.get(+studentId) ?? 'Student'}, you have a new fee invoice. Please check your fee details.`,
                    actionUrl: `/student/fee-list?studentId=${studentId}`
                }))
            );
            return {
                message: 'FeeTemplate and FeePayments created successfully.',
                feeTemplate,
                feePayments
            };
        }

        if (!feeTemplate) {
            const existingInvoice = await prisma.feeTemplate.findFirst({
                where: {
                    invoiceName: invoiceName
                }
            });

            if (existingInvoice) {
                throw customError(`A FeeTemplate with invoice name '${invoiceName}' already exists`, 'fail', 400, true);
            }
            feeTemplate = await prisma.feeTemplate.create({
                data: {
                    groupName: termSubjectGroupName,
                    month,
                    year,
                    termName,
                    termId: +termId,
                    termSubjectGroupId: +termSubjectGroupId,
                    amount: +amount,
                    dueDate: new Date(dueDate),
                    interval: interval === 'MONTHLY' ? PaymentType.MONTHLY : PaymentType.TERM,
                    invoiceName,
                    notes
                }
            });
            const feePayments = await Promise.all(
                studentIds
                    .map(async (studentId) => {
                        const student = await prisma.student.findUnique({ where: { id: parseInt(studentId) }, include: { personalDetails: { select: { firstName: true } } } });
                        if (!student) return null; // Continue if no student is found

                        const studentTermFee = await prisma.studentTermFee.findFirst({
                            where: { studentId: +studentId, termId: +termId, termSubjectGroupId: +termSubjectGroupId }
                        });

                        if (!studentTermFee) {
                            // Throw an error if the student is not enrolled in the specified term subject group
                            throw new Error(`Student with ID ${studentId} is not enrolled in the specified term subject group: ${termSubjectGroupName}`);
                        }

                        const monthNumber = (new Date(`${month} 1, ${year}`).getMonth() + 1).toString().padStart(2, '0');
                        const invoiceId = `${student.akaalId}${termSubjectGroupId}${monthNumber}`;

                        return prisma.feePayment.create({
                            data: {
                                invoiceId,
                                studentTermFeeId: studentTermFee.id,
                                feeTemplateId: feeTemplate?.id,
                                dueDate: new Date(dueDate),
                                dueAmount: +amount,
                                status: 'PENDING',
                                feeAmount: +amount,
                                adjustedFeeAmount: +amount
                            }
                        });
                    })
                    .filter((task) => task !== null)
            ); // Filter out null tasks
            for (const fp of feePayments) {
                if (fp) await autoApplyCreditToFeePaymentInTransaction(prisma, fp.id);
            }
            const feeNames = await getStudentNamesMap(studentIds.map(Number));
            await createManyNotificationsAndPush(
                studentIds.map((studentId) => ({
                    studentId: +studentId,
                    type: NotificationType.FEE,
                    content: `${feeNames.get(+studentId) ?? 'Student'}, you have a new fee invoice. Please check your fee details.`,
                    actionUrl: `/student/fee-list?studentId=${studentId}`
                }))
            );
            return {
                message: 'FeeTemplate and FeePayments created successfully.',
                feeTemplate,
                feePayments
            };
        }
    });
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
            }
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
            }
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
            }
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
            }
        }
    });

    return { activeStudents, count };
}
export async function searchActiveStudentsForFeeCreation(search = '', page: number, termId: number, termSubjectGroupId = 999) {
    const take = 10;
    const searchAsNumber = isNaN(Number(search)) ? undefined : parseInt(search);
    const termFeeFilter =
        termSubjectGroupId === 999 ? { termId: +termId } : { termId: +termId, termSubjectGroupId: +termSubjectGroupId };
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
