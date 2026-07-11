import { db } from '../../../utils/db.server';
import { customError } from '../../../utils/customError';
import { sendEmail } from '../../../utils/email';
import { ApplicantEnrollDataSchema } from '../../../schema/admin.dto/admin.enrollment.dto/admin.enrollment.dto';

export async function findAllApplicants(page: number) {
    const take = 10;
    // const page = 2; // coming from request
    const pageNum: number = page ?? 0;
    const skip = pageNum * take;
    const applicants = await db.student.findMany({
        where: {
            role: 'APPLICANT',
            isActive: false
        },
        skip,
        take,
        select: {
            id: true,
            role: true,
            createdAt: true,
            hasSeenNewApplication: true,
            applicationStatus: true,
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
            role: 'APPLICANT',
            isActive: false
        }
    });

    return { applicants, count };
}

export async function searchApplicants(search: string, page: number) {
    const take = 10;
    // if (search.length == 0) {
    //     throw customError(`No Search query string available`, 'fail', 400, true);
    // }

    const searchAsNumber = isNaN(Number(search)) ? undefined : parseInt(search);

    const pageNum: number = page ?? 0;
    const skip = pageNum * take;
    const applicants = await db.student.findMany({
        skip,
        take,
        where: {
            role: 'APPLICANT',
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
                { id: searchAsNumber !== undefined ? searchAsNumber : {} }
            ]
        },
        select: {
            id: true,
            role: true,
            createdAt: true,
            hasSeenNewApplication: true,
            applicationStatus: true,
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
            role: 'APPLICANT',
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
                { id: searchAsNumber !== undefined ? searchAsNumber : {} }
            ]
        }
    });

    return { applicants, count };
}

/*find applicant by ID*/
export async function findApplicantById(id: string) {
    const applicant = await db.student.findUnique({
        where: {
            id: +id,
            role: 'APPLICANT'
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
            }
        }
    });

    return applicant;
}
/* find published term to enroll*/
export async function findPublishedTermToEnroll() {
    const publishTerm = await db.term.findFirst({
        where: {
            isPublish: true
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

    return publishTerm;
}
/* find current term to enroll*/
export async function findCurrentTermToEnroll() {
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

    if (!currentTerm) {
        throw customError(`Pubslished Term could not found. Please try again later`, 'fail', 404, true);
    }

    return currentTerm;
}
/* enroll applicant to subjects */
export async function enrollApplicant(enrollData: ApplicantEnrollDataSchema['body']) {
    let alreadyEnrolledSubjects = [];

    for (const enrollmentItem of enrollData.enrollData) {
        const existingEnrollments = await db.enrollment.findMany({
            where: { studentId: enrollData.applicantId, termSubjectGroupId: enrollmentItem.termSubjectGroupId },
            include: { subjectEnrollment: { include: { termSubject: true } } }
        });

        for (const enrollment of existingEnrollments) {
            if (enrollment.subjectEnrollment && enrollment.subjectEnrollment.termSubjectId === enrollmentItem.termSubjectId) {
                alreadyEnrolledSubjects.push(enrollmentItem.subject);
            }
        }
    }

    if (alreadyEnrolledSubjects.length > 0) {
        throw new Error(`Already enrolled in subjects: ${alreadyEnrolledSubjects.join(', ')}`);
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
                studentId: enrollData.applicantId,
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
                        studentId: enrollData.applicantId,
                        termSubjectGroupId: termSubjectGroupId,
                        termId: feeInfo.termId
                    }
                },
                update: {},
                create: {
                    studentId: enrollData.applicantId,
                    termSubjectGroupId: termSubjectGroupId,
                    termId: feeInfo.termId
                },
                select: { id: true }
            });
            await db.student.update({
                where: { id: enrollData.applicantId },
                data: { hasSeenNewApplication: true }
            });
        
        }
    }

    const messages = await enrollApplicantToStudent(enrollData.applicantId); // Assuming this function exists

    return { message: 'Enrollment successful', messages };
}

/* de-enroll applicant to subjects */
export async function deEnrollApplicant(deEnrollData: ApplicantEnrollDataSchema['body']) {
    let deEnrolledSubjects = [];

    for (const deEnrollItem of deEnrollData.enrollData) {
        // Find the SubjectEnrollment record
        const subjectEnrollment = await db.subjectEnrollment.findFirst({
            where: {
                termSubjectId: deEnrollItem.termSubjectId,
                enrollment: {
                    studentId: deEnrollData.applicantId,
                    termSubjectGroupId: deEnrollItem.termSubjectGroupId
                }
            }
        });

        if (!subjectEnrollment) {
            throw new Error(`Not enrolled in subject: ${deEnrollItem.subject}`);
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
                studentId: deEnrollData.applicantId,
                termSubjectGroupId: deEnrollItem.termSubjectGroupId
            }
        });

        // If no remaining enrollments, handle StudentTermFee and FeePayment records
        if (remainingEnrollments === 0) {
            const studentTermFee = await db.studentTermFee.findFirst({
                where: {
                    studentId: deEnrollData.applicantId,
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

/* fetch all enrolled subjects for the appicant*/
export async function findApplicantEnrolledSubjects(id: string) {
    // Fetch all enrollments for the student
    const enrollments = await db.enrollment.findMany({
        where: { studentId: parseInt(id) },
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

    // Return the list of enrolled subjects
    return enrolledSubjects;
}

export async function enrollApplicantToStudent(id: number) {
    // Fetch the student record (include personalDetails so we have the email for the
    // enrollment confirmation sent below)
    const student = await db.student.findUnique({
        where: { id },
        include: { personalDetails: true }
    });

    // Check if student record exists
    if (!student) {
        throw customError(`No student found with ID ${id}`, 'fail', 404, true);
    }
    const enrollments = await db.enrollment.findMany({
        where: { studentId: id }
    });

    if (enrollments.length === 0) {
        throw customError(`No enrollments found for the applicant. Please enroll a subject at the subject & classes tab.`, 'fail', 404, true);
    }

    // Check if the student's role is already 'STUDENT'
    if (student.role === 'STUDENT') {
        throw customError(`The applicant is already a student`, 'fail', 404, true);
    }

    // Assign next akaalId so the student is created as Active Student (not Late Enrollment)
    const lastActiveStudent = await db.student.findFirst({
        where: { isActive: true, role: 'STUDENT' },
        orderBy: { akaalId: 'desc' }
    });
    const nextAkaalId = lastActiveStudent ? (lastActiveStudent.akaalId ?? 0) + 1 : 1;

    // Create as Active Student: role STUDENT, isActive true, isAllowedLogin true, akaalId
    await db.student.update({
        where: { id },
        data: {
            role: 'STUDENT',
            isActive: true,
            isAllowedLogin: true,
            akaalId: nextAkaalId
        }
    });

    // Send the enrollment confirmation email. This mirrors the (now UI-removed) late
    // enrollment flow. Best-effort only: the enrollment is already committed above, so a
    // mail failure must never surface as an error or undo the enrollment.
    const email = student.personalDetails?.email;
    if (email) {
        const template = await db.enrollmentConfirmationEmailTemplate.findFirst({
            orderBy: { createdAt: 'desc' }
        });
        if (template) {
            try {
                await sendEmail({ email, subject: template.subject, text: template.text });
                console.log(`Enrollment confirmation email sent to ${email}`);
            } catch (error) {
                console.error(`Failed to send enrollment confirmation email to ${email}:`, error);
            }
        } else {
            console.log('No enrollment confirmation email template found; skipping enrollment confirmation email.');
        }
    } else {
        console.log(`Applicant ${id} has no email on file; skipping enrollment confirmation email.`);
    }

    return { message: `The applicant enrolled to Student successfully` };
}
export async function markApplicantAsSeen(studentId: string) {
    const id = parseInt(studentId, 10); // Ensure the ID is an integer
    return await db.student.update({
        where: { id },
        data: {
            hasSeenNewApplication: true
        }
    });
}

export async function updateApplicationStatus(studentId: string, applicationStatus: string | null) {
    const id = parseInt(studentId, 10);
    if (isNaN(id)) {
        throw new Error('Invalid student ID');
    }
    const student = await db.student.findFirst({ where: { id, role: 'APPLICANT' } });
    if (!student) {
        throw customError('Applicant not found', 'fail', 404, true);
    }
    return await db.student.update({
        where: { id },
        data: { applicationStatus: applicationStatus ?? null }
    });
}
export async function deleteApplication(studentId: string) {
    const id = parseInt(studentId, 10); // Ensure the ID is an integer
    if (isNaN(id)) {
        throw new Error('Invalid student ID');
    }
    return await db.student.delete({
        where: { id }
    });
}
