import { db } from '../../../utils/db.server';
import { customError } from '../../../utils/customError';
import { AlumniEnrollDataSchema } from '../../../schema/admin.dto/admin.alumni.dto/admin.alumni.dto';
import { sendEmail } from '../../../utils/email';


interface EmailTask {
    email: string;
    subject: string;
    text: string;
}


export async function findAllAlumni(page: number) {
    const take = 10;
    // const page = 2; // coming from request
    const pageNum: number = page ?? 0;
    const skip = pageNum * take;
    const alumni = await db.student.findMany({
        where: {
            role: 'ALUMNI',
            isActive: false
        },
        skip,
        take,
        select: {
            id: true,
            role: true,
            akaalId: true,
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
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
    const count = await db.student.count({
        where: {
            role: 'ALUMNI',
            isActive: false
        }
    });

    return { alumni, count };
}

export async function searchAlumni(search: string, page: number) {
    const take = 10;
    // if (search.length == 0) {
    //     throw customError(`No Search query string available`, 'fail', 400, true);
    // }

    const searchAsNumber = isNaN(Number(search)) ? undefined : parseInt(search);

    const pageNum: number = page ?? 0;
    const skip = pageNum * take;
    const alumni = await db.student.findMany({
        skip,
        take,
        where: {
            role: 'ALUMNI',
            isActive: false,
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
                },
                { akaalId: searchAsNumber !== undefined ? searchAsNumber : {} }
            ]
        },
        select: {
            id: true,
            role: true,
            akaalId: true,
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
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    const count = await db.student.count({
        where: {
            role: 'ALUMNI',
            isActive: false,
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
                },
                { akaalId: searchAsNumber !== undefined ? searchAsNumber : {} }
            ]
        }
    });

    return { alumni, count };
}
export async function findAlumniById(alumniId: string) {
    const alumni = await db.student.findUnique({
        where: {
            id: +alumniId,
            role: 'ALUMNI',
            isActive: false
        },
        include: {
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

            otherInformation: {
                select: {
                    id: true,
                    otherInfo: true,
                    declaration: true
                }
            },
            enrollments: true,
            comment: true,
            interaction: true,
            feedback: true,
            AlumniRemarks: {
                orderBy: {
                    createdAt: 'desc'
                }
            }
        }
    });
    const siblings = await db.student.findMany({
        where: {
            personalDetails: {
                email: alumni?.personalDetails?.email
            },

            NOT: {
                id: +alumniId // Exclude the current student
            }
        },
        include: {
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
            otherInformation: {
                select: {
                    id: true,
                    otherInfo: true,
                    declaration: true
                }
            },
            enrollments: {
                select: {
                    subjectEnrollment: true,
                    createdAt: true
                }
            },
            skipReport: {
                select: {
                    isClosed: true
                }
            }
        }
    });
    return { alumni, siblings };
}

export async function findTermToEnrollForAlumni() {
    const currentTerm = await db.term.findFirst({
        where: {
            currentTerm: true
        },
        select: {
            id: true,
            name: true,
            isPublish: true,
            currentTerm: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            updatedAt: true,
            termSubject: {
                select: {
                    id: true,
                    subject: true,
                    termSubjectGroup: true
                }
            }
        }
    });

    // if (!currentTerm) {
    //     throw customError(`current Term could not found. Please try again later`, 'fail', 404, true);
    // }

    return currentTerm;
}
export async function findAlumniEnrolledSubjects(id: string, termId: string) {
    // Fetch all enrollments for the student
    const enrollments = await db.enrollment.findMany({
        where: {
            studentId: parseInt(id),
            termSubjectGroup: {
                termId: +termId
            }
        },
        include: {
            subjectEnrollment: {
                include: {
                    termSubject: {
                        include: {
                            subject: true
                        }
                    }
                }
            }
        }
    });

    // Extract the subjects from the enrollments
    let enrolledSubjects: { subjectId: number; subjectName: string }[] = [];
    enrollments.forEach((enrollment) => {
        if (enrollment.subjectEnrollment) {
            // Check if subjectEnrollment exists
            const se = enrollment.subjectEnrollment;
            enrolledSubjects.push({
                subjectId: se.termSubject.subjectId,
                subjectName: se.termSubject.subject.name
                // Include additional subject details as needed
            });
        }
    });

    return enrolledSubjects;
}

/* enroll late - enrolled student to subjects */
export async function enrollAlumniToSubjects(enrollData: AlumniEnrollDataSchema['body']) {
    let alreadyEnrolledSubjects = [];

    for (const enrollmentItem of enrollData.enrollData) {
        const existingEnrollments = await db.enrollment.findMany({
            where: { studentId: enrollData.alumniId, termSubjectGroupId: enrollmentItem.termSubjectGroupId },
            include: { subjectEnrollment: { include: { termSubject: true } } }
        });

        for (const enrollment of existingEnrollments) {
            if (enrollment.subjectEnrollment && enrollment.subjectEnrollment.termSubjectId === enrollmentItem.termSubjectId) {
                alreadyEnrolledSubjects.push(enrollmentItem.subject);
            }
        }
    }

    if (alreadyEnrolledSubjects.length > 0) {
        throw customError(`Already enrolled in subjects: ${alreadyEnrolledSubjects.join(', ')}`, 'fail', 404, true);
    }

    let uniqueTermSubjectGroupIds = new Set<number>();

    for (const enrollmentItem of enrollData.enrollData) {
        uniqueTermSubjectGroupIds.add(enrollmentItem.termSubjectGroupId);

        const feeInfo = await db.termSubjectGroup.findUnique({
            where: { id: enrollmentItem.termSubjectGroupId },
            include: { fee: true, term: true }
        });

        // Determine due date
        let dueDate = new Date();
        if (feeInfo?.fee?.paymentType === 'MONTHLY') {
            const now = new Date();
            dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            dueDate.setDate(dueDate.getDate() - 5);
        } else if (feeInfo?.fee?.paymentType === 'TERM') {
            const termStartDate = new Date(feeInfo.term.startDate);
            dueDate = new Date(termStartDate.setMonth(termStartDate.getMonth() + 2));
        }

        const newEnrollment = await db.enrollment.create({
            data: {
                studentId: enrollData.alumniId,
                termSubjectGroupId: enrollmentItem.termSubjectGroupId
                // dueDate: dueDate
            },
            select: { id: true }
        });

        const newSubjectEnrollment = await db.subjectEnrollment.create({
            data: {
                enrollmentId: newEnrollment.id,
                termSubjectId: enrollmentItem.termSubjectId
            }
        });
        await db.enrollment.update({
            where: { id: newEnrollment.id },
            data: { subjectEnrollmentId: newSubjectEnrollment.id }
        });
    }

    // Create feePayment records based on unique TermSubjectGroupIds
    for (const termSubjectGroupId of uniqueTermSubjectGroupIds) {
        const feeInfo = await db.termSubjectGroup.findUnique({
            where: { id: termSubjectGroupId },
            include: { fee: true, enrollment: true }
        });

        if (feeInfo?.feeId) {
            const studentTermFee = await db.studentTermFee.upsert({
                where: {
                    studentId_termSubjectGroupId_termId: {
                        studentId: enrollData.alumniId,
                        termSubjectGroupId: termSubjectGroupId,
                        termId: feeInfo.termId
                    }
                },
                update: {},
                create: {
                    studentId: enrollData.alumniId,
                    termSubjectGroupId: termSubjectGroupId,
                    termId: feeInfo.termId
                },
                select: { id: true }
            });

            // const existingFeePayment = await db.feePayment.findFirst({
            //     where: {
            //         studentTermFeeId: studentTermFee.id,
            //         feeId: feeInfo.feeId
            //     }
            // });
            // if (!existingFeePayment) {
            //     await db.feePayment.create({
            //         data: {
            //             feeId: feeInfo.feeId,
            //             studentTermFeeId: studentTermFee.id,
            //             dueDate: feeInfo?.enrollment?.find((en) => en.termSubjectGroupId === termSubjectGroupId)?.dueDate || new Date(),
            //             amountPaid: 0,
            //             dueAmount: feeInfo.fee?.amount || 0,
            //             status: 'PENDING',
            //             method: 'NA',
            //             feeAmount: feeInfo.fee?.amount || 0
            //         }
            //     });
            // }
        }
    }

    return { message: 'Enrollment successful' };
}

/* de-enroll enrolled student to subjects */
export async function deEnrollAlumniEnrolledToSubjects(deEnrollData: AlumniEnrollDataSchema['body']) {
    // Check total number of subjects enrolled in the term
    const termId = deEnrollData.enrollData[0].termId;
    const totalEnrollments = await db.enrollment.count({
        where: {
            studentId: deEnrollData.alumniId,
            termSubjectGroup: {
                termId: termId
            }
        }
    });

    // if (totalEnrollments <= deEnrollData.enrollData.length) {
    //     throw customError('The student must be enrolled in at least one subject.', 'fail', 404, true);
    // }

    let deEnrolledSubjects = [];

    for (const deEnrollItem of deEnrollData.enrollData) {
        // Find the SubjectEnrollment record
        const subjectEnrollment = await db.subjectEnrollment.findFirst({
            where: {
                termSubjectId: deEnrollItem.termSubjectId,
                enrollment: {
                    studentId: deEnrollData.alumniId,
                    termSubjectGroupId: deEnrollItem.termSubjectGroupId
                }
            }
        });

        if (!subjectEnrollment) {
            throw customError(`Not enrolled in subject: ${deEnrollItem.subject}`, 'fail', 404, true);
        }

        // Delete the SubjectEnrollment record
        await db.subjectEnrollment.delete({
            where: { id: subjectEnrollment.id }
        });

        // Delete the Enrollment record
        await db.enrollment.delete({
            where: { id: subjectEnrollment.enrollmentId }
        });

        // Check for remaining enrollments in the same TermSubjectGroup
        const remainingEnrollments = await db.enrollment.count({
            where: {
                studentId: deEnrollData.alumniId,
                termSubjectGroupId: deEnrollItem.termSubjectGroupId
            }
        });

        // If no remaining enrollments, handle StudentTermFee and FeePayment records
        if (remainingEnrollments === 0) {
            const studentTermFee = await db.studentTermFee.findFirst({
                where: {
                    studentId: deEnrollData.alumniId,
                    termSubjectGroupId: deEnrollItem.termSubjectGroupId,
                    termId: deEnrollItem.termId
                }
            });

            if (studentTermFee) {
                // Delete associated FeePayment records
                await db.feePayment.deleteMany({
                    where: { studentTermFeeId: studentTermFee.id }
                });

                // Delete the StudentTermFee record
                await db.studentTermFee.delete({
                    where: { id: studentTermFee.id }
                });
            }
        }

        deEnrolledSubjects.push(deEnrollItem.subject);
    }

    return {
        message: 'De-enrollment process completed',
        deEnrolledSubjects
    };
}
export async function makeAlumniToActiveById(alumniId: string) {
    const student = await db.student.update({
        where: { id: +alumniId },
        data: {
            role: 'STUDENT',
            isActive: true,
            isAllowedLogin: true,
            attendancePercentageValue: 0,
            termAttendance: 0
        }
    });

    if (!student) {
        throw customError(`No student found with ID ${alumniId}`, 'fail', 400, true);
    }

    return student;
}




export async function makeAlumniToActiveById1(alumniId: string) {
    let emailTask: EmailTask | null = null;

    const result = await db.$transaction(async (prisma) => {
        // Update the student record
        const student = await prisma.student.update({
            where: { id: +alumniId },
            data: {
                role: 'STUDENT',
                isActive: true,
                isAllowedLogin: true,
                attendancePercentageValue: 0,
                termAttendance: 0
            },
            include: { personalDetails: true } // Include personal details to get the email
        });

        if (!student) {
            throw customError(`No student found with ID ${alumniId}`, 'fail', 400, true);
        }

        // Fetch the email template
        const template = await prisma.enrollmentConfirmationEmailTemplate.findFirst({
            orderBy: { createdAt: 'desc' }
        });

        if (template && student.personalDetails?.email) {
            emailTask = {
                email: student.personalDetails.email,
                subject: template.subject,
                text: template.text
            };
        }

        return student;
    });

    // After successful transaction, send the email if task exists
    if (emailTask !== null) {
        const { email, subject, text } = emailTask;
        try {
            await sendEmail({ email, subject, text });
            console.log(`Alumni reactivation email sent to ${email}`);
        } catch (error) {
            console.error(`Failed to send alumni reactivation email to ${email}:`, error);
            // You might want to implement a retry mechanism or log this for manual follow-up
        }
    } else {
        console.log('No alumni reactivation email to send.');
    }

    return result;
}