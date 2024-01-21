// import { UpdateStudentDetailSchema } from '../schema/admin.dto/admin.dto';
import { z } from 'zod';

import { EnrolledStudentEnrollDataSchema } from '../../../../schema/admin.dto/admin.student.dto/admin.enrolledstudent/admin.enrolled.student.dto';
import { db } from '../../../../utils/db.server';
import { customError } from '../../../../utils/customError';

// findAllStudents()--
// createStudent(data)--
// findStudentById('1')--

// findByEmail('en@example.com');
// filterStudentsBySubjects(['Science', 'Math']);?
// findStudentByEmail('b@b.com');?
// findStudentsBySearch('e');?
// findUniqueStudent('1')?
// findFeedbackByStudentId('1')?
// createStudentFeedback('feedback for student 3', '3')?
// findSiblingsByParentEmail('b@b.com');

// filter students using subjetcs --> drop down at the student table
export async function filterStudentsBySubjects(subjects: string[], page: number) {
    const take = 10;
    // const page = 2; // coming from request
    const pageNum: number = page ?? 0;
    const skip = pageNum * take;
    const students = await db.student.findMany({
        skip,
        take,
        where: {
            // subjects: {
            //     subjects: {
            //         some: {
            //             subjectName: {
            //                 in: subjects
            //             }
            //         }
            //     }
            // }
        }
    });
}

// Find all enrolled student for the admin

export async function findAllEnrolledStudents(page: number, termId: number) {
    const take = 10;
    const pageNum: number = page ?? 0;
    const skip = pageNum * take;
    const enrolledStudents = await db.student.findMany({
        where: {
            role: 'STUDENT',
            isActive: false,
            studentTermFee: {
                some: {
                    termId: +termId
                }
            }
        },
        skip,
        take,
        orderBy: {
            createdAt: 'desc'
        },
        select: {
            id: true,
            role: true,
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
            }
        }
    });
    const count = await db.student.count({
        where: {
            role: 'STUDENT',
            isActive: false,
            studentTermFee: {
                some: {
                    termId: termId
                }
            }
        }
    });
    return { enrolledStudents, count };
}

// find unqiue student by ID for internal queries
export async function findEnrolledStudentById(id: string) {
    const enrolledStudent = await db.student.findUnique({
        where: {
            id: +id,
            role: 'STUDENT',
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
            }
        }
    });

    return enrolledStudent;
}
// find term to enroll for the subject and classes management
export async function findTermToEnrollForStudentEnrolled() {
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

    if (!publishTerm) {
        throw customError(`Pubslished Term could not found. Please try again later`, 'fail', 404, true);
    }

    return publishTerm;
}
export async function findEnrolledStudentEnrolledSubjects(id: string) {
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
// search enrolled student for the admin
export async function searchEnrolledStudents(search: string, page: number, termId: number) {
    const take = 10;
    if (search.length == 0) {
        throw customError(`No Search query string available`, 'fail', 400, true);
    }
    const pageNum: number = page ?? 0;
    const skip = pageNum * take;
    const enrolledStudents = await db.student.findMany({
        skip,
        take,
        orderBy: {
            createdAt: 'desc'
        },
        where: {
            role: 'STUDENT',
            isActive: false,
            studentTermFee: {
                some: {
                    termId: +termId
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
            role: true,
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
            }
        }
    });
    const count = await db.student.count({
        where: {
            role: 'STUDENT',
            isActive: false,
            studentTermFee: {
                some: {
                    termId: +termId
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

    return { enrolledStudents, count };
}
// delete student
export async function deleteManyStudents() {
    const student = await db.student.deleteMany();
}
/* enroll enrolled student to subjects */
export async function enrollStudentEnrolledToSubjects(enrollData: EnrolledStudentEnrollDataSchema['body']) {
    let alreadyEnrolledSubjects = [];

    for (const enrollmentItem of enrollData.enrollData) {
        const existingEnrollments = await db.enrollment.findMany({
            where: { studentId: enrollData.enrolledStudentId, termSubjectGroupId: enrollmentItem.termSubjectGroupId },
            include: { subjectEnrollment: { include: { termSubject: true } } }
        });

        for (const enrollment of existingEnrollments) {
            if (enrollment.subjectEnrollment && enrollment.subjectEnrollment.termSubjectId === enrollmentItem.termSubjectId) {
                alreadyEnrolledSubjects.push(enrollmentItem.subject);
            }
        }
    }

    if (alreadyEnrolledSubjects.length > 0) {
        throw customError(`Already enrolled in subjects: ${alreadyEnrolledSubjects.join(', ')}`, 'fail', 400, true);
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
                studentId: enrollData.enrolledStudentId,
                termSubjectGroupId: enrollmentItem.termSubjectGroupId,
                dueDate: dueDate
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
                        studentId: enrollData.enrolledStudentId,
                        termSubjectGroupId: termSubjectGroupId,
                        termId: feeInfo.termId
                    }
                },
                update: {},
                create: {
                    studentId: enrollData.enrolledStudentId,
                    termSubjectGroupId: termSubjectGroupId,
                    termId: feeInfo.termId
                },
                select: { id: true }
            });

            const existingFeePayment = await db.feePayment.findFirst({
                where: {
                    studentTermFeeId: studentTermFee.id,
                    feeId: feeInfo.feeId
                }
            });
            if (!existingFeePayment) {
                await db.feePayment.create({
                    data: {
                        feeId: feeInfo.feeId,
                        studentTermFeeId: studentTermFee.id,
                        dueDate: feeInfo?.enrollment?.find((en) => en.termSubjectGroupId === termSubjectGroupId)?.dueDate || new Date(),
                        amountPaid: 0,
                        dueAmount: feeInfo.fee?.amount || 0,
                        status: 'PENDING',
                        method: 'NA',
                        feeAmount: feeInfo.fee?.amount || 0
                    }
                });
            }
        }
    }

    return { message: 'Enrollment successful' };
}

/* de-enroll enrolled student to subjects */
export async function deEnrollStudentEnrolledToSubjects(deEnrollData: EnrolledStudentEnrollDataSchema['body']) {
    // Check total number of subjects enrolled in the term
    const termId = deEnrollData.enrollData[0].termId;
    const totalEnrollments = await db.enrollment.count({
        where: {
            studentId: deEnrollData.enrolledStudentId,
            termSubjectGroup: {
                termId: termId
            }
        }
    });

    if (totalEnrollments <= deEnrollData.enrollData.length) {
        throw customError('The student must be enrolled in at least one subject.', 'fail', 400, true);
    }

    let deEnrolledSubjects = [];

    for (const deEnrollItem of deEnrollData.enrollData) {
        // Find the SubjectEnrollment record
        const subjectEnrollment = await db.subjectEnrollment.findFirst({
            where: {
                termSubjectId: deEnrollItem.termSubjectId,
                enrollment: {
                    studentId: deEnrollData.enrolledStudentId,
                    termSubjectGroupId: deEnrollItem.termSubjectGroupId
                }
            }
        });

        if (!subjectEnrollment) {
            throw customError(`Not enrolled in subject: ${deEnrollItem.subject}`, 'fail', 400, true);
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
                studentId: deEnrollData.enrolledStudentId,
                termSubjectGroupId: deEnrollItem.termSubjectGroupId
            }
        });
        console.log({ remainingEnrollments });
        // If no remaining enrollments, handle StudentTermFee and FeePayment records
        if (remainingEnrollments === 0) {
            const studentTermFee = await db.studentTermFee.findFirst({
                where: {
                    studentId: deEnrollData.enrolledStudentId,
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
// deleteManyStudents();

// Find siblings of a student using parent email

export async function findSiblingsByParentEmail(email: string) {
    try {
        const siblings = await db.student.findMany({
            where: {
                OR: [
                    {
                        parentsDetails: {
                            parentEmail: email
                        }
                    },
                    {
                        personalDetails: {
                            email: email
                        }
                    }
                ]
            }
        });

        console.log(siblings);
        let siblingsDetails: any = [];
        for (let sibling of siblings) {
            const data = await findEnrolledStudentById(sibling.id.toString());
            siblingsDetails = [...siblingsDetails, data];
        }
        console.log('details:', siblingsDetails);
    } catch (e) {
        console.log(e);
        return new Error(`cannot find sibling data @ksm ${e}`);
    }
}

// enroll enrolled-student to active student for the current term
export async function enrollToCurrenTerm(id: string) {
    const student = await db.student.findUnique({
        where: { id: parseInt(id) }
    });
    if (!student) {
        throw customError(`No student found with ID ${id}`, 'fail', 404, true);
    }
    const enrollments = await db.enrollment.findMany({
        where: { studentId: parseInt(id) }
    });

    if (enrollments.length === 0) {
        throw customError(`No enrollments found for the applicant. Please enroll a subject at the subject & classes tab.`, 'fail', 404, true);
    }

    // Check if the student's role is already 'STUDENT'
    if (student.role != 'STUDENT') {
        throw customError(`The applicant is not student`, 'fail', 404, true);
    }
    await db.student.update({
        where: { id: parseInt(id) },
        data: { role: 'STUDENT', isActive: true, isAllowedLogin: true }
    });
    return { message: `The applicant enrolled to Student successfully` };
}
