import { customError } from '../../../utils/customError';
import { db } from '../../../utils/db.server';

export async function findStudentsByEmail(email: string) {
    const students = await db.student.findMany({
        where: {
            personalDetails: {
                email: email
            },
            role: 'STUDENT'
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
            id: +studentId,
            role: 'STUDENT'
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
export async function getAllStudentPortalNotices(studentId: string) {
    const notices = await db.studentNotice.findMany({
        where: {
            studentAcknowledgement: {
                some: {
                    studentId: +studentId
                }
            }
        },
        include: {
            // Including all acknowledgements for these notices that match the student
            studentAcknowledgement: {
                where: {
                    studentId: +studentId
                }
            }
        },
        orderBy: {
            updatedAt: 'desc'
        },
        take: 5
    });
    return notices;
}

export async function getStudentPortalNotice(noticeId: string) {
    return await db.studentNotice.findUnique({
        where: { id: +noticeId }
    });
}

export async function acknowledgeStudentNotice(studentId: string, studentNoticeId: string) {
    return db.$transaction(async (prisma) => {
        // Check if acknowledgement exists
        const acknowledgement = await prisma.studentNoticeAcknowledgement.findUnique({
            where: {
                studentNoticeId_studentId: {
                    studentId: +studentId,
                    studentNoticeId: +studentNoticeId
                }
            }
        });

        // If it doesn't exist, throw error
        if (!acknowledgement) {
            throw new Error('Acknowledgement not found.');
        }

        // If it exists, update the record
        return prisma.studentNoticeAcknowledgement.update({
            where: {
                id: acknowledgement.id
            },
            data: {
                isSeen: true,
                seenAt: new Date() // Sets the seenAt to the current date/time
            }
        });
    });
}

export async function fetchStudentAssignments(studentId: number) {
    const studentAssignments = await db.studentClassAssignment.findMany({
        where: {
            studentId: studentId,
            termSubjectLevel: {
                term: {
                    currentTerm: true
                }
            }
        },
        include: {
            termSubjectLevel: {
                include: {
                    level: true,
                    subject: true
                }
            },
            section: true
        }
    });
    return studentAssignments;
}

export async function findTeacherByAssignment(termSubjectLevelId: string, sectionId: string) {
    const assignment = await db.teacherClassAssignment.findFirst({
        where: {
            termSubjectLevelId: +termSubjectLevelId,
            sectionId: +sectionId
        },
        include: {
            teacher: {
                select: {
                    id: true,
                    teacherPersonalDetails: {
                        select: {
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            }
        }
    });

    return assignment;
}
export async function getAllUnreadStudentNotifications(studentId: string, limit?: string, offset?: string) {
    const currentTerm = await db.term.findFirst({
        where: {
            currentTerm: true
        },
        select: {
            id: true,
            startDate: true,
            endDate: true
        }
    });
    const notifications = await db.notification.findMany({
        where: {
            studentId: +studentId,
            isRead: false,
            createdAt: {
                gte: currentTerm?.startDate,
                lte: currentTerm?.endDate
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
        // take: limit ? +limit : undefined,
        // skip: offset ? +offset : undefined
    });

    return notifications;
}
export async function markNotificationAsRead(notificationId: string) {
    const updatedNotification = await db.notification.update({
        where: { id: parseInt(notificationId) },
        data: { isRead: true }
    });

    return updatedNotification;
}
