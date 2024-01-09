import { db } from '../../../utils/db.server';
import { customError } from '../../../utils/customError';

export async function findAllTeacherApplicants(page: number) {
    const take = 10;
    // const page = 2; // coming from request
    const pageNum: number = page ?? 0;
    const skip = pageNum * take;
    const applicants = await db.teacher.findMany({
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
    const count = await db.teacher.count({
        where: {
            role: 'APPLICANT',
            isActive: false
        }
    });

    return { applicants, count };
}

export async function searchTeacherApplicants(search: string, page: number) {
    const take = 10;
    if (search.length == 0) {
        throw customError(`No Search query string available`, 'fail', 400, true);
    }
    const pageNum: number = page ?? 0;
    const skip = pageNum * take;
    const applicants = await db.teacher.findMany({
        skip,
        take,
        where: {
            role: 'APPLICANT',
            isActive:false,
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

    const count = await db.teacher.count({
        where: {
            role: 'APPLICANT',
            isActive:false,
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
        }
    });

    return { applicants, count };
}
/*find applicant by ID*/
export async function findTeacherApplicantById(id: string) {
    const applicant = await db.teacher.findUnique({
        where: {
            id: +id,
            role: 'APPLICANT',
            isActive:false
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

    return applicant;
}

/*find all subject to assign applicant to  a subject*/
export async function findAllSubjectsToAssignApplicant() {
    const subjects = await db.subject.findMany({
        select: {
            name: true,
            isActive: true
        }
    });

    return subjects;
}
/*Assign a subject to assign applicant*/
export async function assignSubjectToTeacher(teacherId: string, subjectName: string) {
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

export async function findSubjectsAssignedToTeacher(id: string) {
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

/*Approve teacherapplication*/
export async function approveTeacherApplication(id: string) {
    // Check if the teacher has at least one subject assigned
    const assignedSubjects = await db.teacherSubject.count({
        where: {
            teacherId: +id
        }
    });

    // Throw an error if no subjects are assigned
    if (assignedSubjects === 0) {
        throw customError('Teacher does not have any subjects assigned and cannot be approved.', 'fail', 400, true);
    }

    // Update the teacher's role and status
    const updatedTeacher = await db.teacher.update({
        where: {
            id: +id
        },
        data: {
            role: 'TEACHER',
            isActive: true,
            isAllowedLogin: true
        }
    });

    return updatedTeacher;
}
