import { db } from '../../../utils/db.server';
import { customError } from '../../../utils/customError';
import type { DuplicateReader } from '../../teacher.duplicate.service/teacher.duplicate.service';
import { TeacherDuplicateError, describeConflict, findTeacherConflicts, findTeacherWarnings, identityKey, lockIdentity } from '../../teacher.duplicate.service/teacher.duplicate.service';

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

type ApplicantDetails = {
    firstName: string;
    lastName: string;
    DOB: Date;
    email: string;
    contact: string;
    address: string;
    postcode: string;
};

/**
 * Duplicate review for one teacher application (read-only).
 *  - `blocking`: another teacher already uses the email, a TEACHER/ADMIN login uses it, or another teacher has the
 *    same normalised name + DOB (all statuses are compared; the applicant's own record is excluded).
 *  - `warnings`: shared phone, possible duplicate (e.g. Teachers 41/47), and an email shared with a student/family
 *    record or a STUDENT login. Warnings never block approval.
 */
async function buildApplicationReview(teacherId: number, details: ApplicantDetails, client: DuplicateReader) {
    const blocking = await findTeacherConflicts(details, { excludeTeacherId: teacherId }, client);
    const bank = await client.teacherBankDetails.findUnique({ where: { teacherId }, select: { BSB: true, accountNumber: true } });
    const warnings = await findTeacherWarnings({ ...details, bankBsb: bank?.BSB, bankAccount: bank?.accountNumber }, { excludeTeacherId: teacherId }, client);
    // Ready-to-display reasons (teacher ids only; no personal values), identical wording to the 409 returned on approval.
    const blockingMessages = Array.from(new Set(blocking.map(describeConflict)));
    return { blocking, blockingMessages, warnings };
}

const APPLICANT_DETAILS_SELECT = { firstName: true, lastName: true, DOB: true, email: true, contact: true, address: true, postcode: true } as const;

/** Read-only preview shown on the admin approval screen before the admin approves. */
export async function reviewTeacherApplication(id: string) {
    const teacherId = +id;
    const details = await db.teacherPersonalDetails.findUnique({ where: { teacherId }, select: APPLICANT_DETAILS_SELECT });
    if (!details) {
        throw customError('This application has no personal details and cannot be reviewed.', 'fail', 400, true);
    }
    return buildApplicationReview(teacherId, details, db);
}

/*Approve teacherapplication*/
export async function approveTeacherApplication(id: string) {
    const teacherId = +id;
    // Check if the teacher has at least one subject assigned
    const assignedSubjects = await db.teacherSubject.count({
        where: {
            teacherId
        }
    });

    // Throw an error if no subjects are assigned
    if (assignedSubjects === 0) {
        throw customError('Teacher does not have any subjects assigned and cannot be approved.', 'fail', 400, true);
    }

    return db.$transaction(
        async (tx) => {
            const details = await tx.teacherPersonalDetails.findUnique({ where: { teacherId }, select: APPLICANT_DETAILS_SELECT });
            if (!details) {
                // Never approve a record we cannot check.
                throw customError('This application has no personal details and cannot be approved.', 'fail', 400, true);
            }

            // Serialise with any registration/edit for the same identity, then re-check on the BACKEND (not just the UI).
            const identity = identityKey(details.firstName, details.lastName, details.DOB);
            if (identity) await lockIdentity(tx, identity);
            const review = await buildApplicationReview(teacherId, details, tx);
            if (review.blocking.length > 0) {
                throw new TeacherDuplicateError(review.blocking, review.warnings, 'approval');
            }

            // Update the teacher's role and status
            const updatedTeacher = await tx.teacher.update({
                where: {
                    id: teacherId
                },
                data: {
                    role: 'TEACHER',
                    isActive: true,
                    isAllowedLogin: true
                }
            });

            // Warnings (shared phone, possible duplicate, shared student/family email) do not block approval.
            return { ...updatedTeacher, warnings: review.warnings };
        },
        { timeout: 15000 }
    );
}
