import { customError } from '../../../utils/customError';
import { db } from '../../../utils/db.server';
import { fetchCheckedInStudentsWithAttendance } from '../../teacher.service/teacher.attendance.service/teacher.attendance.service';
import { findAllClassworkByTermAndSectionForAdmin } from '../../classwork.service/classwork.service';
import { findAllHomeworkByTermAndSectionForAdmin } from '../../homework.service/homework.service';

export async function findAllTeachers() {
    const approvedTeachers = await db.teacher.findMany({
        where: {
            role: 'TEACHER',
            isActive: true
        },
        select: {
            id: true,
            role: true,
            isActive: true,
            createdAt: true,
            teacherPersonalDetails: {
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

            teacherEmergencyContact: {
                select: {
                    id: true,
                    contactPerson: true,
                    contactNumber: true,
                    relationship: true
                }
            },
            teacherWWCHealthInformation: {
                select: {
                    id: true,
                    medicareNumber: true,
                    medicalCondition: true,
                    childrenCheckCardNumber: true,
                    workingwithChildrenCheckCardPhotoImage: true,
                    workingWithChildrenCheckExpiry: true
                }
            },
            teacherWorkRights: {
                select: {
                    immigrationStatus: true,
                    workRights: true
                }
            },
            teacherQualificationAvailability: {
                select: {
                    experience: true,
                    qualification: true,
                    subjectsChosen: true,
                    timeSlotsChosen: true
                }
            },
            teacherBankDetails: {
                select: {
                    ABN: true,
                    accountNumber: true,
                    bankAccountName: true,
                    BSB: true
                }
            },
            teacherOtherInformation: {
                select: {
                    id: true,
                    otherInfo: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return approvedTeachers;
}
export async function searchTeachers(search: string) {
    if (search.length == 0) {
        throw customError(`No Search query string available`, 'fail', 400, true);
    }
    const approvedTeachers = await db.teacher.findMany({
        where: {
            role: 'TEACHER',
            isActive: true,
            OR: [
                {
                    teacherPersonalDetails: {
                        OR: [
                            { firstName: { contains: search, mode: 'insensitive' } },
                            { lastName: { contains: search, mode: 'insensitive' } },
                            { email: { contains: search, mode: 'insensitive' } },
                            { contact: { contains: search, mode: 'insensitive' } },
                            { postcode: { contains: search, mode: 'insensitive' } }
                        ]
                    }
                }
            ]
        },
        select: {
            id: true,
            role: true,
            isActive: true,
            createdAt: true,
            teacherPersonalDetails: {
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

            teacherEmergencyContact: {
                select: {
                    id: true,
                    contactPerson: true,
                    contactNumber: true,
                    relationship: true
                }
            },
            teacherWWCHealthInformation: {
                select: {
                    id: true,
                    medicareNumber: true,
                    medicalCondition: true,
                    childrenCheckCardNumber: true,
                    workingwithChildrenCheckCardPhotoImage: true,
                    workingWithChildrenCheckExpiry: true
                }
            },
            teacherWorkRights: {
                select: {
                    immigrationStatus: true,
                    workRights: true
                }
            },
            teacherQualificationAvailability: {
                select: {
                    experience: true,
                    qualification: true,
                    subjectsChosen: true,
                    timeSlotsChosen: true
                }
            },
            teacherBankDetails: {
                select: {
                    ABN: true,
                    accountNumber: true,
                    bankAccountName: true,
                    BSB: true
                }
            },
            teacherOtherInformation: {
                select: {
                    id: true,
                    otherInfo: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return approvedTeachers;
}
/*find teacher by ID*/
export async function findTeacherById(id: string) {
    const teacher = await db.teacher.findUnique({
        where: {
            id: +id,
            role: 'TEACHER',
            isActive: true
        },
        select: {
            id: true,
            role: true,
            isActive: true,
            createdAt: true,
            teacherPersonalDetails: {
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

            teacherEmergencyContact: {
                select: {
                    id: true,
                    contactPerson: true,
                    contactNumber: true,
                    relationship: true
                }
            },
            teacherWWCHealthInformation: {
                select: {
                    id: true,
                    medicareNumber: true,
                    medicalCondition: true,
                    childrenCheckCardNumber: true,
                    workingwithChildrenCheckCardPhotoImage: true,
                    workingWithChildrenCheckExpiry: true
                }
            },
            teacherWorkRights: {
                select: {
                    immigrationStatus: true,
                    workRights: true
                }
            },
            teacherQualificationAvailability: {
                select: {
                    experience: true,
                    qualification: true,
                    subjectsChosen: true,
                    timeSlotsChosen: true
                }
            },
            teacherBankDetails: {
                select: {
                    ABN: true,
                    accountNumber: true,
                    bankAccountName: true,
                    BSB: true
                }
            },
            teacherOtherInformation: {
                select: {
                    id: true,
                    otherInfo: true
                }
            }
        }
    });

    return teacher;
}

/*find all subject to assign to teacher*/
export async function findAllSubjectsToAssignTeacher() {
    const subjects = await db.subject.findMany({
        select: {
            name: true,
            isActive: true
        }
    });

    return subjects;
}
/*Assign a subject to teacher*/
export async function assignSubjectToApprovedTeacher(teacherId: string, subjectName: string) {
    const subject = await db.subject.findUnique({
        where: { name: subjectName }
    });

    if (!subject) {
        throw customError(`Subject '${subjectName}' not found.`, 'fail', 400, true);
    }

    const existingAssignment = await db.teacherSubject.findFirst({
        where: {
            teacherId: +teacherId,
            subjectId: subject.id
        }
    });

    if (existingAssignment) {
        throw customError(`Subject '${subjectName}' is already assigned to this teacher.`, 'fail', 400, true);
    }

    const newAssignment = await db.teacherSubject.create({
        data: {
            teacherId: +teacherId,
            subjectId: subject.id
        }
    });

    return { message: 'Successfully assigned' };
}
export async function findSubjectsAssignedToApprovedTeacher(id: string) {
    const currentTerm = await db.term.findFirst({
        where: {
            currentTerm: true
        }
    });
    
    const assignedSubjects = await db.teacherSubject.findMany({
        where: {
            teacherId: +id,
            subject: {
                termSubject: {
                    some: {
                        term: {
                            currentTerm: true
                        }
                    }
                }
            }
        },
        include: {
            subject: true
        }
    });
    // Mapping to get only necessary details, if needed
    // return assignedSubjects;
    return assignedSubjects.map((assignment) => ({
        name: assignment.subject.name,
        isActive: assignment.subject.isActive
    }));
}

//assign class to teachers
export async function assignClassToTeacher(teacherId: string, termId: string, subjectName: string, levelName: string, sectionName: string) {
    // Validate Teacher
    const teacher = await db.teacher.findUnique({ where: { id: parseInt(teacherId) } });
    if (!teacher || !teacher.isActive) {
        throw customError('Teacher not found or is not active', 'fail', 400, true);
        //         throw customError(`Subject '${subjectName}' not found.`, 'fail', 400, true);
    }

    // Find Subject ID
    const subject = await db.subject.findUnique({ where: { name: subjectName } });
    if (!subject) {
        throw customError('Subject not found', 'fail', 400, true);
    }

    // Fetch TermSubjectLevel Details
    const termSubjectLevel = await db.termSubjectLevel.findFirst({
        where: {
            termId: parseInt(termId),
            subjectId: subject.id,
            level: { name: levelName }
        },
        include: { sections: true }
    });
    if (!termSubjectLevel) {
        throw customError('TermSubjectLevel not found', 'fail', 400, true);
    }

    // Validate Section
    const section = termSubjectLevel.sections.find((s) => s.name === sectionName);
    if (!section) {
        throw customError('Invalid section name for the given TermSubjectLevel', 'fail', 400, true);
    }

    // Validate Subject Assignment
    const subjectAssigned = await db.teacherSubject.findFirst({
        where: { teacherId: parseInt(teacherId), subjectId: subject.id }
    });
    if (!subjectAssigned) {
        throw customError('Subject not assigned to teacher', 'fail', 400, true);
    }

    // Check Existing Assignments
    const existingAssignment = await db.teacherClassAssignment.findFirst({
        where: {
            teacherId: parseInt(teacherId),
            termSubjectLevelId: termSubjectLevel.id,
            sectionId: section.id
        }
    });
    if (existingAssignment) {
        throw customError('This class is already assigned to the teacher', 'fail', 400, true);
    }

    // Create TeacherClassAssignment Record
    return await db.teacherClassAssignment.create({
        data: {
            teacherId: parseInt(teacherId),
            termSubjectLevelId: termSubjectLevel.id,
            sectionId: section.id
        }
    });
}
// find current term for assign classes to teachers
export const findCurrentTermToAssignClass = async () => {
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
                    level: true,
                    termSubjectGroup: true
                }
            },
            termSubjectLevel: {
                include: {
                    sections: {
                        select: { name: true }
                    },
                    level: { select: { name: true } },
                    subject: { select: { name: true } }
                }
            }
        }
    });

    if (!currentTerm) {
        throw customError(`Current Term could not found. Please try again later`, 'fail', 404, true);
    }

    return currentTerm;
};
/*get all classes for teachers*/
export const findAllAssignedClassesForTeachers = async (teacherId: string) => {
    const assignedClasses = await db.teacherClassAssignment.findMany({
        where: {
            teacherId: parseInt(teacherId),
            termSubjectLevel: {
                term: {
                    currentTerm: true
                }
            }
        },
        include: {
            termSubjectLevel: {
                include: {
                    subject: true,
                    level: true,
                    term: true
                }
            },
            section: true
        }
    });

    return assignedClasses;
};
export const deleteTeacherSubject = async (teacherId: string, subjectName: string) => {
    // First, find the subject ID based on the subject name
    const subject = await db.subject.findFirst({
        where: { name: subjectName },
        select: { id: true }
    });

    if (!subject) {
        throw customError(`Subject '${subjectName}' not found.`, 'fail', 404, true);
    }

    // Check if there are any class assignments for the given teacher and subject ID
    const existingAssignments = await db.teacherClassAssignment.findMany({
        where: {
            teacherId: +teacherId,
            termSubjectLevel: {
                subjectId: subject.id
            }
        }
    });

    // If there are existing assignments, throw an error
    if (existingAssignments.length > 0) {
        throw customError(`Subject '${subjectName}' cannot be deleted since there is a class associated with it.`, 'fail', 404, true);
    }

    // If no class assignments, delete the subject for the teacher
    await db.teacherSubject.deleteMany({
        where: {
            teacherId: +teacherId,
            subjectId: subject.id
        }
    });

    return 'Subject deleted successfully';
};
export async function deleteClassForTeacher(teacherId: string, termId: string, subjectName: string, levelName: string, sectionName: string) {
    // Validate and find the subject
    const subject = await db.subject.findUnique({ where: { name: subjectName } });
    if (!subject) {
        throw customError('Subject not found', 'fail', 404, true);
    }

    // Fetch TermSubjectLevel Details
    const termSubjectLevel = await db.termSubjectLevel.findFirst({
        where: {
            termId: parseInt(termId),
            subjectId: subject.id,
            level: { name: levelName }
        },
        include: { sections: true }
    });
    if (!termSubjectLevel) {
        throw customError('TermSubjectLevel not found', 'fail', 404, true);
    }

    // Validate Section
    const section = termSubjectLevel.sections.find((s) => s.name === sectionName);
    if (!section) {
        throw customError('Invalid section name for the given TermSubjectLevel', 'fail', 404, true);
    }

    // Find the assignment to delete
    const assignment = await db.teacherClassAssignment.findFirst({
        where: {
            teacherId: parseInt(teacherId),
            termSubjectLevelId: termSubjectLevel.id,
            sectionId: section.id
        }
    });

    if (!assignment) {
        throw customError('No class assignment found for deletion', 'fail', 404, true);
    }

    // Proceed with deletion
    await db.teacherClassAssignment.delete({
        where: { id: assignment.id }
    });

    return 'Class assignment successfully deleted';
}
// quick view
export const findAllAssignedClasses = async () => {
    const assignedClasses = await db.teacherClassAssignment.findMany({
        where: {
            termSubjectLevel: {
                term: {
                    currentTerm: true
                },
                subject: {
                    termSubject: {
                        some: {
                            isOnSunday: true
                        }
                    }
                }
            }
        },
        include: {
            termSubjectLevel: {
                include: {
                    subject: {
                        include: {
                            termSubject: {
                                select: {
                                    isOnSunday: true,
                                    isOnWeekday: true
                                }
                            }
                        }
                    },
                    level: true,
                    term: true
                }
            },
            section: true,
            teacher: {
                include: {
                    teacherPersonalDetails: true
                }
            }
        }
    });

    return assignedClasses;
};

/** Get attendance, classwork, and homework for all classes in one place (admin) */
export const getClassRecordsForAdmin = async () => {
    // Fetch all current-term class assignments without subject-day filtering
    // so every subject (including Kirtan, weekday-only classes, etc.) is included.
    const assignedClasses = await db.teacherClassAssignment.findMany({
        where: {
            termSubjectLevel: {
                term: { currentTerm: true }
            }
        },
        include: {
            termSubjectLevel: {
                include: {
                    subject: {
                        include: {
                            termSubject: {
                                select: { isOnSunday: true, isOnWeekday: true }
                            }
                        }
                    },
                    level: true,
                    term: true
                }
            },
            section: true,
            teacher: {
                include: { teacherPersonalDetails: true }
            }
        }
    });
    const classKey = (tslId: number, secId: number) => `${tslId}-${secId}`;
    const seen = new Set<string>();
    const uniqueClasses: Array<{
        termSubjectLevelId: number;
        sectionId: number;
        teacherId: number;
        className: string;
        timeSlot: string | null;
        termSubjectLevel: (typeof assignedClasses)[0]['termSubjectLevel'];
        section: (typeof assignedClasses)[0]['section'];
        teacher: (typeof assignedClasses)[0]['teacher'];
    }> = [];
    for (const row of assignedClasses) {
        const key = classKey(row.termSubjectLevelId, row.sectionId);
        if (seen.has(key)) continue;
        seen.add(key);
        const className = `${row.termSubjectLevel.subject.name} ${row.termSubjectLevel.level.name} ${row.section.name}`;
        uniqueClasses.push({
            termSubjectLevelId: row.termSubjectLevelId,
            sectionId: row.sectionId,
            teacherId: row.teacherId,
            className,
            timeSlot: row.timeSlot,
            termSubjectLevel: row.termSubjectLevel,
            section: row.section,
            teacher: row.teacher
        });
    }

    // Fetch timetable slots once to resolve timing for each class
    const timetableSlots = await db.timetableSlot.findMany({
        where: {
            termSubjectLevelId: { in: uniqueClasses.map(c => c.termSubjectLevelId) },
        },
        include: { timeSlot: true }
    });
    const timingMap = new Map<string, string>();
    for (const slot of timetableSlots) {
        if (!slot.termSubjectLevelId || !slot.sectionId) continue;
        const key = classKey(slot.termSubjectLevelId, slot.sectionId);
        if (!timingMap.has(key)) {
            timingMap.set(key, slot.timeSlot.timeRange);
        }
    }

    const processClass = async (cls: (typeof uniqueClasses)[0]) => {
            const [attendanceData, classwork, homework] = await Promise.all([
                fetchCheckedInStudentsWithAttendance(cls.termSubjectLevelId.toString(), cls.sectionId.toString()),
                findAllClassworkByTermAndSectionForAdmin(cls.termSubjectLevelId.toString(), cls.sectionId.toString()),
                findAllHomeworkByTermAndSectionForAdmin(cls.termSubjectLevelId.toString(), cls.sectionId.toString())
            ]);

            let total = attendanceData.length;
            let present = 0;
            let absent = 0;
            let leave = 0;
            let notCheckedIn = 0;
            for (const row of attendanceData) {
                if (row.classAttendance?.attendanceStatus === 'PRESENT') present++;
                else if (row.classAttendance?.attendanceStatus === 'LEAVE') leave++;
                else if (row.checkInData?.checkedIn) absent++;
                else if (row.checkInData?.isMarked) absent++;
                else notCheckedIn++;
            }

            const teacherName = cls.teacher?.teacherPersonalDetails
                ? `${cls.teacher.teacherPersonalDetails.firstName} ${cls.teacher.teacherPersonalDetails.lastName}`
                : null;

            const timing = timingMap.get(classKey(cls.termSubjectLevelId, cls.sectionId)) ?? null;

            return {
                classInfo: {
                    termSubjectLevelId: cls.termSubjectLevelId,
                    sectionId: cls.sectionId,
                    teacherId: cls.teacherId,
                    className: cls.className,
                    sectionName: cls.section.name,
                    termId: cls.termSubjectLevel.term.id,
                    teacherName,
                    timing
                },
                attendanceSummary: {
                    total,
                    present,
                    absent,
                    leave,
                    notCheckedIn
                },
                classwork,
                homework
            };
    };

    // Process in batches of 5 to avoid exhausting the DB connection pool
    const BATCH_SIZE = 5;
    const results = [];
    for (let i = 0; i < uniqueClasses.length; i += BATCH_SIZE) {
        const batch = uniqueClasses.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map(processClass));
        results.push(...batchResults);
    }

    return results;
};
