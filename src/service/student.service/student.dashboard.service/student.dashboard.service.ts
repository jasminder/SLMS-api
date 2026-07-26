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

/** Prisma include used by every "student shaped for the app" query. */
const studentForAppInclude = (termId?: number) => ({
    personalDetails: true,
    studentClassAssignment: {
        where: {
            ...(termId != null && {
                termSubjectLevel: {
                    term: { id: termId }
                }
            }),
            isCurrentlyAssigned: true
        },
        take: 1,
        include: {
            section: true,
            termSubjectLevel: {
                select: {
                    level: { select: { name: true } }
                }
            }
        }
    }
});

type StudentForAppRow = Awaited<ReturnType<typeof db.student.findMany<{ include: ReturnType<typeof studentForAppInclude> }>>>[number];

/** Shapes a student row into the payload the mobile app's student switcher expects. */
function mapStudentForApp(s: StudentForAppRow) {
    const pd = s.personalDetails;
    const classAssignment = s.studentClassAssignment?.[0];
    const className = classAssignment?.termSubjectLevel?.level?.name && classAssignment?.section?.name
        ? `${classAssignment.termSubjectLevel.level.name} - ${classAssignment.section.name}`
        : classAssignment?.termSubjectLevel?.level?.name ?? '—';
    const rawImage = (pd?.image?.trim() ?? '').replace(/^\//, '');
    return {
        id: String(s.id),
        name: {
            english: pd ? `${pd.firstName} ${pd.lastName}`.trim() : '',
            punjabi: pd?.punjabiName ?? ''
        },
        photo: rawImage,
        studentId: String(s.akaalId ?? s.id),
        class: className,
        attendance: s.attendancePercentageValue ?? 0
    };
}

/** Returns current student + siblings for the app (student switcher). Does not throw when none found. */
export async function getStudentsForApp(email: string) {
    if (!email || typeof email !== 'string' || !email.trim()) {
        return [];
    }

    const currentTerm = await db.term.findFirst({
        where: { currentTerm: true },
        select: { id: true }
    });

    const students = await db.student.findMany({
        where: {
            personalDetails: {
                email: { equals: email.trim(), mode: 'insensitive' }
            },
            role: 'STUDENT'
        },
        include: studentForAppInclude(currentTerm?.id)
    });

    return students.map(mapStudentForApp);
}

/**
 * Returns a single student in the same shape as [getStudentsForApp], addressed by id
 * rather than by the caller's own email. Backs the admin "view as student" mode, so the
 * route that exposes it is ADMIN-only. Returns [] when the id matches no student.
 */
export async function getStudentForAppById(studentId: string) {
    const id = Number(studentId);
    if (!Number.isInteger(id) || id <= 0) return [];

    const currentTerm = await db.term.findFirst({
        where: { currentTerm: true },
        select: { id: true }
    });

    const student = await db.student.findFirst({
        where: { id, role: 'STUDENT' },
        include: studentForAppInclude(currentTerm?.id)
    });

    return student ? [mapStudentForApp(student)] : [];
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
        orderBy: { id: 'desc' },
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

export async function upsertStudentDeviceToken(studentId: number, token: string, platform: string) {
    return db.deviceToken.upsert({
        where: { token },
        create: {
            studentId,
            token,
            platform,
            lastSeen: new Date()
        },
        update: {
            studentId,
            platform,
            lastSeen: new Date()
        }
    });
}

export async function resolveStudentIdFromUserId(userId: number) {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { studentId: true }
    });
    return user?.studentId ?? null;
}

type StudentProfilePatch = {
    email?: string;
    contact?: string;
    address?: string;
    image?: string;
};

export async function updateStudentProfileForApp(studentId: string, user: any, data: StudentProfilePatch) {
    const targetStudentId = +studentId;
    const student = await db.student.findUnique({
        where: { id: targetStudentId },
        select: {
            id: true,
            personalDetails: {
                select: { email: true }
            }
        }
    });

    if (!student) {
        throw customError('Student not found', 'fail', 404, true);
    }

    const role = (user?.role ?? '').toString().toUpperCase();
    const actorEmail = (user?.email ?? '').toString().trim().toLowerCase();
    const studentEmail = (student.personalDetails?.email ?? '').toString().trim().toLowerCase();
    const isOwnerByStudentId = Number(user?.student?.id) == targetStudentId;
    const isOwnerByEmail = actorEmail !== '' && studentEmail !== '' && actorEmail === studentEmail;

    const canEdit = role === 'ADMIN' || (role === 'STUDENT' && (isOwnerByStudentId || isOwnerByEmail)) || (role === 'PARENT' && isOwnerByEmail);
    if (!canEdit) {
        throw customError('Not allowed to update this student profile', 'fail', 403, true);
    }

    const updateData: Record<string, string> = {};
    if (typeof data.email === 'string' && data.email.trim().length > 0) {
        updateData.email = data.email.trim().toLowerCase();
    }
    if (typeof data.contact === 'string' && data.contact.trim().length > 0) {
        updateData.contact = data.contact.trim();
    }
    if (typeof data.address === 'string' && data.address.trim().length > 0) {
        updateData.address = data.address.trim();
    }
    if (typeof data.image === 'string' && data.image.trim().length > 0) {
        updateData.image = data.image.trim();
    }

    if (Object.keys(updateData).length === 0) {
        throw customError('No valid profile fields to update', 'fail', 400, true);
    }

    return db.student.update({
        where: { id: targetStudentId },
        data: {
            personalDetails: {
                update: updateData
            }
        },
        include: {
            personalDetails: true
        }
    });
}
