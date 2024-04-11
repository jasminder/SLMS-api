import { customError } from '../../../utils/customError';
import { db } from '../../../utils/db.server';

export async function findStudentsByEmail(email: string) {
    const students = await db.student.findMany({
        where: {
            personalDetails: {
                email: email
            }
        },
        include: {
            personalDetails: true
        }
    });

    if (students.length === 0) {
        throw customError(`No students found with email ${email}`, 'fail', 404, true);
    }

    return students;
}

// find unqiue student by ID for internal queries
export async function findStudentDetailsById(studentId: string) {
    const currentTerm = await db.term.findFirst({
        where: {
            currentTerm: true
        },
        select: {
            id: true
        }
    });
    const activeStudent = await db.student.findUnique({
        where: {
            id: +studentId
        },
        include: {
            personalDetails: {
                select: {
                    id: true,
                    studentId: true,
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
            },
            studentClassAssignment: {
                where: {
                    termSubjectLevel: {
                        term: {
                            id: currentTerm?.id
                        }
                    }
                },
                include: {
                    section: true,
                    termSubjectLevel: {
                        select: {
                            level: {
                                select: {
                                    name: true
                                }
                            },
                            subject: {
                                select: {
                                    name: true,
                                    termSubject: {
                                        select: {
                                            isOnSunday: true,
                                            isOnWeekday: true
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

    return activeStudent;
}
