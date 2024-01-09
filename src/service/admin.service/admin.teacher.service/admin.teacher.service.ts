import { customError } from '../../../utils/customError';
import { db } from '../../../utils/db.server';

export async function findAllTeachers() {
    const approvedTeachers = await db.teacher.findMany({
        where: {
            role: 'TEACHER',
            isActive: true
        },
        select: {
            id: true,
            role: true,
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

    return { approvedTeachers };
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
    const assignedSubjects = await db.teacherSubject.findMany({
        where: {
            teacherId: +id
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
