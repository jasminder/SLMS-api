import { db } from '../../../../utils/db.server';
import { customError } from '../../../../utils/customError';
import { ActiveStudentEnrollDataSchema } from '../../../../schema/admin.dto/admin.student.dto/admin.active.students.dto/admin.active.students.dto';
import { Day, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { getIo } from '../../../../sockets/socket';
import { updateStudentLastTwoDaysAttendance } from '../../admin.checkin.service/admin.checkin.service';

type AttendanceFilter = {
    attendancePercentageValue?: number;
};

async function updateEmailsToLowercase() {
    const personalDetails = await db.personalDetails.findMany({
        where: {},
        select: {
            id: true, // Select only id and email for updating
            email: true
        }
    });
    const updatePromises = personalDetails.map((details) => {
        return db.personalDetails.update({
            where: {
                id: details.id // Use the id to specify which record to update
            },
            data: {
                email: details.email.toLowerCase() // Convert email to lowercase in JavaScript
            }
        });
    });

    // Execute all update operations concurrently
    await Promise.all(updatePromises);
    console.log(`Updated ${updatePromises.length} records.`);
}

export async function findActiveStudents(page: number, termId: number) {
    const take = 10;
    const pageNum = page ?? 0;
    const skip = pageNum * take;

    const activeStudents = await db.student.findMany({
        where: {
            role: 'STUDENT',
            isActive: true,
            studentTermFee: {
                some: {
                    termId: +termId
                }
            }
        },
        skip,
        take,
        orderBy: {
            attendancePercentageValue: 'desc'
        },
        select: {
            id: true,
            akaalId: true,
            role: true,
            termAttendance: true,
            attendancePercentageValue: true,

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
            },
            skipReport: {
                select: {
                    isClosed: true
                }
            },
            schoolCheckInAttendance: {
                orderBy: {
                    date: 'desc'
                },
                take: 3
            }
        }
    });

    const count = await db.student.count({
        where: {
            role: 'STUDENT',
            isActive: true,
            studentTermFee: {
                some: {
                    termId: +termId
                }
            }
        }
    });

    return { activeStudents, count };
}
export async function findActiveStudentsWithNoSubjects(page: number, termId: number) {
    const take = 10;
    const pageNum = page ?? 0;
    const skip = pageNum * take;
    const studentsWithNoSubjects = await db.student.count({
        where: {
            role: 'STUDENT',
            isActive: true,
            studentTermFee: {
                none: {
                    termId: +termId
                }
            }
        }
    });

    const activeStudents = await db.student.findMany({
        where: {
            role: 'STUDENT',
            isActive: true,
            studentTermFee: {
                none: {
                    termId: +termId
                }
            }
        },
        skip,
        take,
        orderBy: {
            akaalId: 'desc'
        },
        select: {
            id: true,
            akaalId: true,
            role: true,
            termAttendance: true,
            previousTermAttendance: true,
            attendancePercentageValue: true,
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
            },
            skipReport: {
                select: {
                    isClosed: true
                }
            },
            schoolCheckInAttendance: {
                orderBy: {
                    date: 'desc'
                },
                take: 3
            }
        }
    });

    const count = await db.student.count({
        where: {
            role: 'STUDENT',
            isActive: true,
            studentTermFee: {
                none: {
                    termId: +termId
                }
            }
        }
    });

    return { activeStudents, count, studentsWithNoSubjects };
}

/**
 * Builds the subject / level / section conditions shared by the admin students list
 * (`searchActiveStudents`, which renders the table) and its select-all companion
 * (`selectActiveStudents`). Keeping one implementation is deliberate: these two drifted
 * apart before, so "select all" could tick students the table never showed.
 *
 * Level and section must be satisfied by the SAME class assignment — applying them
 * independently matched students whose level and section came from two unrelated
 * classes. Only currently-assigned rows in the selected term count, so a deactivated
 * assignment no longer makes a student look like they are still in the class.
 *
 * Subject joins that same assignment only when a level or section is also chosen. On its
 * own it keeps its enrollment-based meaning, so students enrolled in a subject but not
 * yet assigned to a class still appear.
 */
function buildStudentClassFilters(
    termId: number,
    subjectOption: string,
    levelOption: string,
    sectionOption: string
): Pick<Prisma.StudentWhereInput, 'enrollments' | 'studentClassAssignment'> {
    const conditions: Pick<Prisma.StudentWhereInput, 'enrollments' | 'studentClassAssignment'> = {};

    if (subjectOption) {
        conditions.enrollments = {
            some: {
                AND: [
                    {
                        subjectEnrollment: {
                            termSubject: {
                                subjectId: +subjectOption,
                                termId
                            }
                        }
                    },
                    {
                        termSubjectGroup: {
                            termId
                        }
                    }
                ]
            }
        };
    }

    const termSubjectLevel: Prisma.TermSubjectLevelWhereInput = { termId };
    const assignmentFilter: Prisma.StudentClassAssignmentWhereInput = {
        isCurrentlyAssigned: true,
        termSubjectLevel
    };
    let hasAssignmentFilter = false;

    if (levelOption) {
        termSubjectLevel.levelId = +levelOption;
        hasAssignmentFilter = true;
    }

    if (sectionOption) {
        assignmentFilter.sectionId = +sectionOption;
        hasAssignmentFilter = true;
    }

    if (subjectOption && hasAssignmentFilter) {
        termSubjectLevel.subjectId = +subjectOption;
    }

    if (hasAssignmentFilter) {
        conditions.studentClassAssignment = { some: assignmentFilter };
    }

    return conditions;
}

export async function searchActiveStudents(
    search = '',
    page: number,
    termId: number,
    subjectOption = '',
    levelOption = '',
    sectionOption = '',
    attendanceOption = '',
    sort = 'termAttendance',
    sort_dir = 'asc'
) {
    const take = 10;
    const pageNum = page ?? 0;
    const skip = pageNum * take;
    const searchAsNumber = isNaN(Number(search)) ? undefined : parseInt(search);
    const currentTerm = await db.term.findFirst({
        where: {
            currentTerm: true
        }
    });
    const isSelectedTermCurrent = currentTerm?.id === +termId;
    // Base where condition
    let whereCondition: Prisma.StudentWhereInput = {
        role: isSelectedTermCurrent ? 'STUDENT' : undefined,
        isActive: isSelectedTermCurrent ? true : undefined,
        studentTermFee: {
            some: {
                termId: +termId
            }
        }
    };

    // Add attendance filter if specified
    if (attendanceOption) {
        whereCondition.attendancePercentageValue = +attendanceOption;
    }

    Object.assign(whereCondition, buildStudentClassFilters(+termId, subjectOption, levelOption, sectionOption));

    // Add search conditions
    if (search) {
        whereCondition.OR = [
            ...(searchAsNumber ? [{ akaalId: searchAsNumber }] : []),
            {
                personalDetails: {
                    OR: [
                        { firstName: { contains: search, mode: 'insensitive' } },
                        { lastName: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                        { contact: { contains: search, mode: 'insensitive' } },
                        { address: { contains: search, mode: 'insensitive' } },
                        { suburb: { contains: search, mode: 'insensitive' } },
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
        ];
    }

    const activeStudents = await db.student.findMany({
        skip,
        take,
        orderBy:
            sort === 'dob'
                ? [{ personalDetails: { DOB: sort_dir === 'asc' ? 'asc' : 'desc' } }, { id: 'asc' }]
                : sort === 'termAttendance'
                ? [{ termAttendance: sort_dir === 'desc' ? 'desc' : 'asc' }, { id: 'asc' }]
                : sort === 'akaalId'
                ? [{ akaalId: sort_dir === 'desc' ? 'desc' : 'asc' }, { id: 'asc' }]
                : [{ personalDetails: { firstName: sort_dir === 'asc' ? 'asc' : 'desc' } }, { id: 'asc' }],
        where: whereCondition,
        select: {
            id: true,
            akaalId: true,
            role: true,
            isActive: true,
            updatedAt: true,
            createdAt: true,
            termAttendance: true,
            attendancePercentageValue: true,
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
            },
            skipReport: {
                select: {
                    isClosed: true
                }
            },
            schoolCheckInAttendance: {
                orderBy: {
                    date: 'desc'
                },
                take: 3
            }
        }
    });

    const count = await db.student.count({
        where: whereCondition
    });

    return { activeStudents, count };
}

export async function searchActiveStudentsWithNoSubjects(
    search = '',
    page: number,
    termId: number,
    subjectOption = '',
    levelOption = '',
    sectionOption = '',
    attendanceOption = '',
    sort = 'previousTermAttendance',
    sort_dir = 'asc'
) {
    const take = 10;
    const searchAsNumber = isNaN(Number(search)) ? undefined : parseInt(search);
    const studentsWithNoSubjects = await db.student.count({
        where: {
            role: 'STUDENT',
            isActive: true,
            studentTermFee: {
                none: {
                    termId: +termId
                }
            }
        }
    });
    if (searchAsNumber) {
        const pageNum: number = page ?? 0;
        const skip = pageNum * take;
        const activeStudents = await db.student.findMany({
            skip,
            take,
            orderBy: {
                previousTermAttendance: sort_dir === 'asc' ? 'asc' : 'desc'
            },
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    none: {
                        termId: +termId
                    }
                },

                OR: [
                    { akaalId: searchAsNumber },
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
                akaalId: true,
                role: true,
                isActive: true,
                updatedAt: true,
                createdAt: true,
                termAttendance: true,
                previousTermAttendance: true,
                attendancePercentageValue: true,
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
                },
                skipReport: {
                    select: {
                        isClosed: true
                    }
                },
                schoolCheckInAttendance: {
                    orderBy: {
                        date: 'desc'
                    },
                    take: 3
                }
            }
        });
        const count = await db.student.count({
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    none: {
                        termId: +termId
                    }
                },

                OR: [
                    { akaalId: searchAsNumber },
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
        return { activeStudents, count, studentsWithNoSubjects };
    } else if (!searchAsNumber) {
        const pageNum: number = page ?? 0;
        const skip = pageNum * take;
        const activeStudents = await db.student.findMany({
            skip,
            take,
            orderBy: {
                previousTermAttendance: sort_dir === 'asc' ? 'asc' : 'desc'
            },
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    none: {
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
                akaalId: true,
                role: true,
                isActive: true,
                updatedAt: true,
                createdAt: true,
                termAttendance: true,
                previousTermAttendance: true,
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
                },
                skipReport: {
                    select: {
                        isClosed: true
                    }
                },
                schoolCheckInAttendance: {
                    orderBy: {
                        date: 'desc'
                    },
                    take: 3
                }
            }
        });
        const count = await db.student.count({
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    none: {
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
        return { activeStudents, count, studentsWithNoSubjects };
    }
}
export async function defaultSelectActiveStudents(page: number, termId: number) {
    const activeStudents = await db.student.findMany({
        where: {
            role: 'STUDENT',
            isActive: true,
            studentTermFee: {
                some: {
                    termId: +termId
                }
            }
        },
        orderBy: {
            akaalId: 'desc'
        },
        select: {
            id: true,
            akaalId: true,
            role: true,
            isActive: true,

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
            }
        }
    });

    const count = await db.student.count({
        where: {
            role: 'STUDENT',
            isActive: true,
            studentTermFee: {
                some: {
                    termId: +termId
                }
            }
        }
    });

    return { activeStudents, count };
}
export async function defaultSelectActiveStudentsWIthNoSubjects(page: number, termId: number) {
    // console.log(termId);
    const activeStudents = await db.student.findMany({
        where: {
            role: 'STUDENT',
            isActive: true,
            studentTermFee: {
                none: {
                    termId: +termId
                }
            }
        },
        orderBy: {
            akaalId: 'desc'
        },
        select: {
            id: true,
            akaalId: true,
            role: true,
            isActive: true,

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
            }
        }
    });

    const count = await db.student.count({
        where: {
            role: 'STUDENT',
            isActive: true,
            studentTermFee: {
                none: {
                    termId: +termId
                }
            }
        }
    });

    return { activeStudents, count };
}

export async function selectActiveStudents(
    search = '',
    page: number,
    termId: number,
    subjectOption = '',
    levelOption = '',
    sectionOption = '',
    attendanceOption = '',
    sort = 'termAttendance',
    sort_dir = 'asc'
) {
    const searchAsNumber = isNaN(Number(search)) ? undefined : parseInt(search);

    // Base where condition. Mirrors searchActiveStudents (which renders the table) so
    // "select all" can never tick a student the table did not show.
    let whereCondition: Prisma.StudentWhereInput = {
        role: 'STUDENT',
        isActive: true,
        attendancePercentageValue: attendanceOption ? +attendanceOption : undefined,
        studentTermFee: {
            some: {
                termId: +termId
            }
        }
    };

    Object.assign(whereCondition, buildStudentClassFilters(+termId, subjectOption, levelOption, sectionOption));

    // Add search conditions
    if (search) {
        whereCondition.OR = [
            ...(searchAsNumber ? [{ akaalId: searchAsNumber }] : []),
            {
                personalDetails: {
                    OR: [
                        { firstName: { contains: search, mode: 'insensitive' } },
                        { lastName: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                        { contact: { contains: search, mode: 'insensitive' } },
                        { address: { contains: search, mode: 'insensitive' } },
                        { suburb: { contains: search, mode: 'insensitive' } },
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
        ];
    }

    const activeStudents = await db.student.findMany({
        orderBy:
            sort === 'dob'
                ? [{ personalDetails: { DOB: sort_dir === 'asc' ? 'asc' : 'desc' } }, { id: 'asc' }]
                : sort === 'termAttendance'
                ? [{ termAttendance: sort_dir === 'desc' ? 'desc' : 'asc' }, { id: 'asc' }]
                : sort === 'akaalId'
                ? [{ akaalId: sort_dir === 'desc' ? 'desc' : 'asc' }, { id: 'asc' }]
                : [{ personalDetails: { firstName: sort_dir === 'asc' ? 'asc' : 'desc' } }, { id: 'asc' }],
        where: whereCondition,
        select: {
            id: true,
            akaalId: true,
            role: true,
            isActive: true,
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
            }
        }
    });

    const count = await db.student.count({
        where: whereCondition
    });

    return { activeStudents, count };
}
export async function selectActiveStudents1(
    search = '',
    page: number,
    termId: number,
    subjectOption = '',
    levelOption = '',
    sectionOption = '',
    attendanceOption = '',
    sort = 'termAttendance',
    sort_dir = 'asc'
) {
    const searchAsNumber = isNaN(Number(search)) ? undefined : parseInt(search);

    let classAssignmentFilters: Prisma.StudentClassAssignmentWhereInput[] = [];

    if (subjectOption) {
        classAssignmentFilters.push({
            termSubjectLevel: {
                subject: {
                    id: +subjectOption
                }
            }
        });
    }

    if (levelOption) {
        classAssignmentFilters.push({
            termSubjectLevel: {
                level: {
                    id: +levelOption
                }
            }
        });
    }
    if (sectionOption) {
        classAssignmentFilters.push({
            sectionId: +sectionOption
        });
    }
    const attendanceFilter: AttendanceFilter = {};
    if (attendanceOption !== '') {
        attendanceFilter.attendancePercentageValue = +attendanceOption;
    }
    if (searchAsNumber) {
        const activeStudents = await db.student.findMany({
            orderBy:
                sort === 'dob'
                    ? [{ personalDetails: { DOB: sort_dir === 'asc' ? 'asc' : 'desc' } }, { id: 'asc' }]
                    : sort === 'termAttendance'
                    ? [{ termAttendance: sort_dir == 'desc' ? 'desc' : 'asc' }, { id: 'asc' }]
                    : sort === 'akaalId'
                    ? [{ akaalId: sort_dir == 'desc' ? 'desc' : 'asc' }, { id: 'asc' }]
                    : [{ personalDetails: { firstName: sort_dir === 'asc' ? 'asc' : 'desc' } }, { id: 'asc' }],
            where: {
                role: 'STUDENT',
                isActive: true,
                attendancePercentageValue: attendanceOption ? +attendanceOption : undefined,
                studentClassAssignment: {
                    some: {
                        AND: classAssignmentFilters
                    }
                },

                OR: [
                    { akaalId: searchAsNumber },
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
                akaalId: true,
                role: true,
                isActive: true,

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
                }
            }
        });
        const count = await db.student.count({
            where: {
                role: 'STUDENT',
                isActive: true,
                attendancePercentageValue: attendanceOption ? +attendanceOption : undefined,
                studentClassAssignment: {
                    some: {
                        AND: classAssignmentFilters
                    }
                },

                OR: [
                    { akaalId: searchAsNumber },
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
        return { activeStudents, count };
    } else if (!searchAsNumber) {
        const activeStudents = await db.student.findMany({
            orderBy:
                sort === 'dob'
                    ? [{ personalDetails: { DOB: sort_dir === 'asc' ? 'asc' : 'desc' } }, { id: 'asc' }]
                    : sort === 'termAttendance'
                    ? [{ termAttendance: sort_dir == 'desc' ? 'desc' : 'asc' }, { id: 'asc' }]
                    : sort === 'akaalId'
                    ? [{ akaalId: sort_dir == 'desc' ? 'desc' : 'asc' }, { id: 'asc' }]
                    : [{ personalDetails: { firstName: sort_dir === 'asc' ? 'asc' : 'desc' } }, { id: 'asc' }],
            where: {
                role: 'STUDENT',
                isActive: true,
                attendancePercentageValue: attendanceOption ? +attendanceOption : undefined,
                studentClassAssignment: {
                    some: {
                        AND: classAssignmentFilters
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
                akaalId: true,
                role: true,
                isActive: true,

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
                }
            }
        });
        const count = await db.student.count({
            where: {
                role: 'STUDENT',
                isActive: true,
                attendancePercentageValue: attendanceOption ? +attendanceOption : undefined,
                studentClassAssignment: {
                    some: {
                        AND: classAssignmentFilters
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
        return { activeStudents, count };
    }
}
export async function selectActiveStudentsWithNoSubjects(
    search = '',
    page: number,
    termId: number,
    subjectOption = '',
    levelOption = '',
    sectionOption = '',
    attendanceOption = '',
    sort = 'previousTermAttendance',
    sort_dir = 'asc'
) {
    const searchAsNumber = isNaN(Number(search)) ? undefined : parseInt(search);
    if (searchAsNumber) {
        const activeStudents = await db.student.findMany({
            orderBy: {
                previousTermAttendance: sort_dir === 'asc' ? 'asc' : 'desc'
            },
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    none: {
                        termId: +termId
                    }
                },

                OR: [
                    { akaalId: searchAsNumber },
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
                akaalId: true,
                role: true,
                isActive: true,
                previousTermAttendance: true,

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
                }
            }
        });
        const count = await db.student.count({
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    none: {
                        termId: +termId
                    }
                },

                OR: [
                    { akaalId: searchAsNumber },
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
        return { activeStudents, count };
    } else if (!searchAsNumber) {
        const activeStudents = await db.student.findMany({
            orderBy: {
                previousTermAttendance: sort_dir === 'asc' ? 'asc' : 'desc'
            },
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    none: {
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
                akaalId: true,
                role: true,
                isActive: true,
                previousTermAttendance: true,
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
                }
            }
        });
        const count = await db.student.count({
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    none: {
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
        return { activeStudents, count };
    }
}

// find unqiue student by ID for internal queries
export async function findActiveStudentById(id: string, termId: string) {
    const currentTerm = await db.term.findFirst({
        where: {
            currentTerm: true
        }
    });
    const isSelectedTermCurrent = currentTerm?.id === +termId;

    const activeStudent = await db.student.findUnique({
        where: {
            id: +id,
            role: isSelectedTermCurrent ? 'STUDENT' : undefined,
            isActive: isSelectedTermCurrent ? true : undefined,
            studentTermFee: {
                some: {
                    termId: +termId
                }
            }
        },
        include: {
            personalDetails: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    punjabiName: true,
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
    const siblings = await db.student.findMany({
        where: {
            personalDetails: {
                email: activeStudent?.personalDetails?.email
            },

            NOT: {
                id: +id // Exclude the current student
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

    return { activeStudent, siblings };
}

export async function findActiveStudentByIdWithoutSubjects(id: string) {
    const activeStudent = await db.student.findUnique({
        where: {
            id: +id,
            role: 'STUDENT',
            isActive: true
        },
        include: {
            personalDetails: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    punjabiName: true,
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
    const siblings = await db.student.findMany({
        where: {
            personalDetails: {
                email: activeStudent?.personalDetails?.email
            },

            NOT: {
                id: +id // Exclude the current student
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

    return { activeStudent, siblings };
}

export async function findStudentFeeDetails(studentId: number, termId: number) {
    const actualCurrentTerm = await db.term.findFirst({
        where: { currentTerm: true },
        select: { id: true }
    });

    const studentTermFees = await db.feePayment.findMany({
        where: {
            studentTermFee: {
                studentId,
                termId
            }
        },
        include: {
            feeTemplate: true,
            studentTermFee: {
                select: {
                    student: {
                        select: {
                            creditBalance: true
                        }
                    }
                }
            }
        }
    });

    // When viewing the current term, always include unpaid/overdue fees from the previous term
    // so pending and overdue amounts are visible after a term change
    const isViewingCurrentTerm = actualCurrentTerm?.id === termId;
    let previousTermUnpaid: typeof studentTermFees = [];

    if (isViewingCurrentTerm) {
        // Previous term = the term we're not viewing with the latest endDate (the one we just left)
        const previousTerm = await db.term.findFirst({
            where: { id: { not: termId } },
            orderBy: { endDate: 'desc' },
            select: { id: true }
        });

        if (previousTerm) {
            previousTermUnpaid = await db.feePayment.findMany({
                where: {
                    studentTermFee: {
                        studentId,
                        termId: previousTerm.id
                    },
                    dueAmount: { gt: 0 },
                    OR: [
                        { status: 'PENDING' },
                        { status: 'OVERDUE' }
                    ]
                },
                include: {
                    feeTemplate: true,
                    studentTermFee: {
                        select: {
                            student: {
                                select: {
                                    creditBalance: true
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    if (studentTermFees.length === 0 && previousTermUnpaid.length === 0) {
        return studentTermFees;
    }
    if (studentTermFees.length === 0) {
        return previousTermUnpaid;
    }
    if (previousTermUnpaid.length === 0) {
        return studentTermFees;
    }
    return [...studentTermFees, ...previousTermUnpaid];
}

export async function findTermSubjectGroupIdEnrolledSubjects(id: string, termSubjectGroupId: string) {
    // Fetch all enrollments for the student
    const enrollments = await db.enrollment.findMany({
        where: {
            studentId: parseInt(id),
            termSubjectGroup: {
                id: +termSubjectGroupId
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

/*-----------------fee-----------------------*/
/*find fee details by id. When skipAutoApply is true, credit is not auto-applied (for manage-fee UI so user can choose). */
export async function findFeePaymentById(id: string, skipAutoApply?: boolean) {
    // AUTO-CREDIT DISABLED (2026-06): credit must no longer be auto-applied on fee view.
    // It silently spent students' creditBalance (May & June). Apply credit manually only
    // via PATCH /api/v1/apply-credit-balance-to-student-feePayment-by-id. See docs/gotchas.md.
    // if (!skipAutoApply) {
    //     await autoApplyCreditToFeePayment(id);
    // }
    const feePaymentById = await db.feePayment.findUnique({
        where: {
            id: +id
        },
        include: {
            studentTermFee: {
                select: {
                    student: {
                        select: {
                            creditBalance: true
                        }
                    }
                }
            },
            feeTemplate: {
                select: {
                    invoiceName: true
                }
            }
        }
    });
    return feePaymentById;
}

/*update fee - amount paid made by the admin*/
// export async function updateAmountPaidAtSchool(feePaymentId: string, paidAmount: string, paidDate: string, paymentMethod: string, paymentStatus: string, remarks: string, receivedBy: string) {
//     return db.$transaction(async (transaction) => {
//         const feePayment = await transaction.feePayment.findUnique({
//             where: { id: +feePaymentId },
//             include: { studentTermFee: { include: { student: true } } }
//         });

//         if (!feePayment) {
//             throw customError('Fee payment record not found', 'fail', 400, true);
//         }
//         const newDueAmount = feePayment.dueAmount - parseInt(paidAmount);

//         let updateStatus: PaymentStatus;
//         let overDue = false;
//         if (newDueAmount > 0 && new Date() > new Date(feePayment.dueDate)) {
//             overDue = true;
//             updateStatus = PaymentStatus.OVERDUE;
//         } else {
//             updateStatus = PaymentStatus.PENDING;
//         }
//         if (newDueAmount <= 0) {
//             updateStatus = PaymentStatus.PAID; // Update status to PAID only if due amount is zero or less
//         }
//         // Validate client-provided paymentStatus
//         // if (paymentStatus === 'PAID' && newDueAmount > 0) {
//         //     throw customError('Invalid payment status: "PAID" cannot be applied unless the due amount is zero.', 'fail', 400, true);
//         // }
//         // if (paymentStatus === 'PENDING' && newDueAmount === 0) {
//         //     throw customError('Invalid payment status: "PENDING" cannot be applied if the due amount is zero.', 'fail', 400, true);
//         // }
//         // if (paymentStatus === 'OVERDUE') {
//         //     if (newDueAmount <= 0 || new Date() <= new Date(feePayment.dueDate)) {
//         //         throw customError('Invalid payment status: "OVERDUE" cannot be applied unless the due amount is more than zero and the current date is past the due date.', 'fail', 400, true);
//         //     }
//         //     updateStatus = PaymentStatus.OVERDUE; // Explicitly setting to OVERDUE as provided and validated
//         // }
//         const paymentInstallment = await transaction.paymentInstallment.create({
//             data: {
//                 feePaymentId: +feePaymentId,
//                 paidAmount: +paidAmount,
//                 paidDate: paidDate ? new Date(paidDate) : new Date(),
//                 paymentMethod: paymentMethod === 'CREDIT_CARD' ? PaymentMethod.CREDIT_CARD : paymentMethod === 'CASH' ? PaymentMethod.CASH : PaymentMethod.OTHER,
//                 paymentStatus: updateStatus,
//                 remarks,
//                 receivedBy
//             }
//         });
//         await transaction.feePayment.update({
//             where: { id: +feePaymentId },
//             data: {
//                 dueAmount: newDueAmount > 0 ? newDueAmount : 0,
//                 hasOverDue: overDue,
//                 status: updateStatus
//             }
//         });

//         const extraAmount = newDueAmount < 0 ? -newDueAmount : 0;
//         if (extraAmount > 0) {
//             await transaction.student.update({
//                 where: { id: feePayment.studentTermFee?.student.id },
//                 data: {
//                     creditBalance: {
//                         increment: extraAmount
//                     },
//                     hasOverDue: overDue
//                 }
//             });
//         }

//         return {
//             paymentInstallment,
//             newDueAmount,
//             extraAmount
//         };
//     });
// }

export async function updateAmountPaidAtSchool(feePaymentId: string, paidAmount: string, paidDate: string, paymentMethod: string, remarks: string, receivedBy: string) {
    return db.$transaction(async (transaction) => {
        const feePayment = await transaction.feePayment.findUnique({
            where: { id: +feePaymentId },
            include: { studentTermFee: { include: { student: true } } }
        });

        if (!feePayment) {
            throw customError('Fee payment record not found', 'fail', 400, true);
        }

        const newDueAmount = feePayment.dueAmount - parseInt(paidAmount);
        const currentDate = new Date();
        const dueDate = new Date(feePayment.dueDate);

        // Use user-entered payment date when valid; only fall back to current date when missing or invalid
        const parsedPaidDate = paidDate && typeof paidDate === 'string' ? new Date(paidDate) : null;
        const paymentDateToStore =
            parsedPaidDate && !Number.isNaN(parsedPaidDate.getTime()) ? parsedPaidDate : currentDate;

        // Determine the status based on the new due amount and due date
        let updateStatus: PaymentStatus;
        let overDue = false;

        if (newDueAmount <= 0) {
            updateStatus = PaymentStatus.PAID;
        } else if (currentDate > dueDate) {
            updateStatus = PaymentStatus.OVERDUE;
            overDue = true;
        } else {
            updateStatus = PaymentStatus.PENDING;
        }

        const paymentInstallment = await transaction.paymentInstallment.create({
            data: {
                feePaymentId: +feePaymentId,
                paidAmount: +paidAmount,
                paidDate: paymentDateToStore,
                paymentMethod: paymentMethod === 'CREDIT_CARD' ? PaymentMethod.CREDIT_CARD : paymentMethod === 'CASH' ? PaymentMethod.CASH : PaymentMethod.OTHER,
                paymentStatus: updateStatus,
                remarks: remarks || 'No remarks',
                receivedBy
            }
        });

        await transaction.feePayment.update({
            where: { id: +feePaymentId },
            data: {
                dueAmount: Math.max(newDueAmount, 0),
                hasOverDue: overDue,
                status: updateStatus
            }
        });

        const extraAmount = Math.max(-newDueAmount, 0);
        if (extraAmount > 0) {
            await transaction.student.update({
                where: { id: feePayment.studentTermFee?.student.id },
                data: {
                    creditBalance: {
                        increment: extraAmount
                    },
                    hasOverDue: overDue
                }
            });
        }

        return {
            paymentInstallment,
            newDueAmount: Math.max(newDueAmount, 0),
            extraAmount
        };
    });
}

export async function updateAmountFeeDue(feePaymentId: string, newDueAmount: number, discountReason: string) {
    return db.$transaction(async (prisma) => {
        const feePayment = await prisma.feePayment.findUnique({
            where: { id: +feePaymentId },
            include: {
                studentTermFee: { select: { studentId: true } },
                paymentInstallment: { select: { paidAmount: true, paymentMethod: true } }
            }
        });

        if (!feePayment) throw customError('Fee payment record not found.', 'fail', 404, true);

        const originalFeeAmount = feePayment.feeAmount ?? feePayment.adjustedFeeAmount ?? 0;
        const newDiscountAmount = Math.max(0, originalFeeAmount - newDueAmount);

        // Total paid = only real payments (exclude DISCOUNT so due = total fee − paid; discount is handled separately)
        const totalPaid = (feePayment.paymentInstallment || [])
            .filter((i) => (i as { paymentMethod?: string }).paymentMethod !== 'DISCOUNT')
            .reduce((sum, i) => sum + (i.paidAmount ?? 0), 0);
        const remainingDue = Math.max(0, newDueAmount - totalPaid);

        // Compare calendar dates only: overdue only when due amount > 0 and today is strictly after the due date
        const now = new Date();
        const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const due = new Date(feePayment.dueDate);
        const dueDateStart = new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()));
        const overDue = remainingDue > 0 && todayStart > dueDateStart;

        let status: PaymentStatus;
        if (remainingDue <= 0) {
            status = PaymentStatus.PAID;
        } else if (overDue) {
            status = PaymentStatus.OVERDUE;
        } else {
            status = PaymentStatus.PENDING;
        }

        // When increasing (or same): remove any existing discount installments so due recalculates correctly.
        // When reducing: we will create one new discount installment below (after removing any old one).
        await prisma.paymentInstallment.deleteMany({
            where: { feePaymentId: +feePaymentId, paymentMethod: 'DISCOUNT' }
        });

        const updatedFeePayment = await prisma.feePayment.update({
            where: { id: feePayment.id },
            data: {
                dueAmount: remainingDue,
                hasDiscount: newDiscountAmount > 0,
                discountAmount: newDiscountAmount,
                adjustedFeeAmount: newDueAmount,
                discountReason: discountReason,
                status,
                hasOverDue: overDue
            }
        });

        // When reducing amount: create a single discount installment for audit (e.g. 100 → 70 → discount 30).
        if (newDiscountAmount > 0) {
            await prisma.paymentInstallment.create({
                data: {
                    feePaymentId: +feePaymentId,
                    paidAmount: newDiscountAmount,
                    paidDate: new Date(),
                    paymentMethod: 'DISCOUNT',
                    paymentStatus: status,
                    remarks: discountReason,
                    receivedBy: 'ADMIN'
                }
            });
        }

        const studentId = feePayment.studentTermFee?.studentId;
        if (studentId != null) {
            const allPayments = await prisma.feePayment.findMany({
                where: { studentTermFee: { studentId } },
                select: { dueAmount: true, status: true }
            });
            const currentInvoiceDue = allPayments.reduce((sum, p) => sum + (p.dueAmount ?? 0), 0);
            const overDueTotal = allPayments
                .filter((p) => p.status === 'OVERDUE')
                .reduce((sum, p) => sum + (p.dueAmount ?? 0), 0);
            await prisma.student.update({
                where: { id: studentId },
                data: {
                    currentInvoiceDue,
                    overDue: overDueTotal,
                    hasOverDue: overDueTotal > 0
                }
            });
        }

        return updatedFeePayment;
    });
}

type PrismaTransactionClient = Omit<typeof db, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/** Internal: apply credit to a fee payment (assumes creditToApply > 0 and within bounds). Used by applyStudentCredit and auto-apply. */
async function applyCreditToFeePaymentInternal(
    prisma: PrismaTransactionClient,
    feePaymentId: number,
    creditToApply: number,
    remarks: string
) {
    const feePayment = await prisma.feePayment.findUnique({
        where: { id: feePaymentId },
        include: { studentTermFee: { include: { student: true } } }
    });
    if (!feePayment?.studentTermFee?.student) return null;
    const student = feePayment.studentTermFee.student;
    let updateStatus = feePayment.status as PaymentStatus;
    let overDue = feePayment.hasOverDue ?? false;
    let newDueAmount = feePayment.dueAmount - creditToApply;
    const remainingCredit = student.creditBalance - creditToApply;

    if (newDueAmount <= 0) {
        newDueAmount = 0;
        updateStatus = PaymentStatus.PAID;
        overDue = false;
    }

    await prisma.feePayment.update({
        where: { id: feePaymentId },
        data: { dueAmount: newDueAmount, status: updateStatus, hasOverDue: overDue }
    });
    await prisma.student.update({
        where: { id: student.id },
        data: { creditBalance: remainingCredit, hasOverDue: overDue }
    });
    await prisma.paymentInstallment.create({
        data: {
            feePaymentId,
            paidAmount: creditToApply,
            paidDate: new Date(),
            paymentMethod: PaymentMethod.CREDIT_BALANCE,
            paymentStatus: updateStatus,
            remarks,
            receivedBy: 'ADMIN'
        }
    });
    return { newDueAmount, remainingCredit };
}

/** Automatically apply available credit to a fee payment. If credit >= due, fee becomes PAID and remaining credit stays on student. If credit < due, deducts credit and leaves rest pending. */
export async function autoApplyCreditToFeePayment(feePaymentId: string) {
    return db.$transaction(async (prisma) => {
        const feePayment = await prisma.feePayment.findUnique({
            where: { id: +feePaymentId },
            include: { studentTermFee: { include: { student: true } } }
        });
        if (!feePayment || !feePayment.studentTermFee?.student) return null;
        if (feePayment.status === 'PAID' && feePayment.dueAmount === 0) return null;
        if (feePayment.dueAmount <= 0) return null;
        const student = feePayment.studentTermFee.student;
        if (student.creditBalance <= 0) return null;
        const creditToApply = Math.min(student.creditBalance, feePayment.dueAmount);
        if (creditToApply <= 0) return null;
        return applyCreditToFeePaymentInternal(prisma, +feePaymentId, creditToApply, 'Auto-applied credit');
    });
}

/** Same as autoApplyCreditToFeePayment but runs inside an existing transaction (e.g. when creating fee payments). */
export async function autoApplyCreditToFeePaymentInTransaction(
    prisma: PrismaTransactionClient,
    feePaymentId: number
) {
    const feePayment = await prisma.feePayment.findUnique({
        where: { id: feePaymentId },
        include: { studentTermFee: { include: { student: true } } }
    });
    if (!feePayment || !feePayment.studentTermFee?.student) return;
    if (feePayment.status === 'PAID' && feePayment.dueAmount === 0) return;
    if (feePayment.dueAmount <= 0) return;
    const student = feePayment.studentTermFee.student;
    if (student.creditBalance <= 0) return;
    const creditToApply = Math.min(student.creditBalance, feePayment.dueAmount);
    if (creditToApply <= 0) return;
    await applyCreditToFeePaymentInternal(prisma, feePaymentId, creditToApply, 'Auto-applied credit');
}

/*apply credit balanc in student table*/
export async function applyStudentCredit(feePaymentId: string, creditToApply: number, remarks: string) {
    if (creditToApply < 0) {
        throw customError('Invalid credit amount specified.', 'fail', 400, true);
    }
    return db.$transaction(async (prisma) => {
        const feePayment = await prisma.feePayment.findUnique({
            where: { id: +feePaymentId },
            include: { studentTermFee: { include: { student: true } } }
        });

        if (!feePayment) {
            throw customError('FeePayment not found.', 'fail', 400, true);
        }

        if (feePayment.status === 'PAID' && feePayment.dueAmount === 0) {
            throw customError('This FeePayment is already settled and cannot be modified.', 'fail', 400, true);
        }

        const student = feePayment.studentTermFee?.student;
        if (!student) {
            throw customError('Associated student not found.', 'fail', 400, true);
        }

        if (student.creditBalance <= 0) {
            throw customError('No available credit balance.', 'fail', 400, true);
        }
        if (creditToApply > student.creditBalance) {
            throw customError('Requested credit exceeds available balance.', 'fail', 400, true);
        }
        if (creditToApply > feePayment.dueAmount) {
            throw customError('Cannot apply more credit than the due amount.', 'fail', 400, true);
        }

        const result = await applyCreditToFeePaymentInternal(prisma, +feePaymentId, creditToApply, remarks);
        const updatedFeePayment = await prisma.feePayment.findUnique({ where: { id: +feePaymentId } });
        return {
            message: 'Credit applied successfully.',
            feePayment: updatedFeePayment,
            remainingCredit: result?.remainingCredit ?? student.creditBalance - creditToApply
        };
    });
}
/*get all payment installments*/
export async function getPaymentsByFeePaymentId(feePaymentId: string) {
    const payments = await db.paymentInstallment.findMany({
        where: {
            feePaymentId: parseInt(feePaymentId)
        },
        include: {
            feePayment: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return payments;
}

/* update a single payment installment (edit wrong fee) and recalculate FeePayment due amount */
function mapPaymentMethod(method: string): PaymentMethod {
    if (method === 'CREDIT_CARD') return PaymentMethod.CREDIT_CARD;
    if (method === 'CASH') return PaymentMethod.CASH;
    if (method === 'BANK_TRANSFER') return PaymentMethod.OTHER;
    return PaymentMethod.OTHER;
}

export async function updatePaymentInstallment(
    paymentInstallmentId: string,
    paidAmount: string,
    paidDate: string,
    paymentMethod: string,
    remarks: string,
    receivedBy: string
) {
    return db.$transaction(async (transaction) => {
        const installment = await transaction.paymentInstallment.findUnique({
            where: { id: +paymentInstallmentId },
            include: {
                feePayment: {
                    include: {
                        studentTermFee: { include: { student: true } }
                    }
                }
            }
        });

        if (!installment) {
            throw customError('Payment installment not found', 'fail', 404, true);
        }

        const feePayment = installment.feePayment;
        if (!feePayment) {
            throw customError('Fee payment record not found', 'fail', 400, true);
        }

        const oldPaidAmount = installment.paidAmount;
        const newPaidAmount = parseInt(paidAmount, 10);
        if (Number.isNaN(newPaidAmount) || newPaidAmount < 0) {
            throw customError('Invalid paid amount', 'fail', 400, true);
        }

        const parsedPaidDate = paidDate && typeof paidDate === 'string' ? new Date(paidDate) : null;
        const paymentDateToStore =
            parsedPaidDate && !Number.isNaN(parsedPaidDate.getTime()) ? parsedPaidDate : new Date(installment.paidDate ?? installment.createdAt);

        const newDueAmount = feePayment.dueAmount + oldPaidAmount - newPaidAmount;
        const currentDate = new Date();
        const dueDate = new Date(feePayment.dueDate);

        let updateStatus: PaymentStatus;
        let overDue = false;
        if (newDueAmount <= 0) {
            updateStatus = PaymentStatus.PAID;
        } else if (currentDate > dueDate) {
            updateStatus = PaymentStatus.OVERDUE;
            overDue = true;
        } else {
            updateStatus = PaymentStatus.PENDING;
        }

        await transaction.paymentInstallment.update({
            where: { id: +paymentInstallmentId },
            data: {
                paidAmount: newPaidAmount,
                paidDate: paymentDateToStore,
                paymentMethod: mapPaymentMethod(paymentMethod),
                remarks: remarks || 'No remarks',
                receivedBy
            }
        });

        await transaction.feePayment.update({
            where: { id: feePayment.id },
            data: {
                dueAmount: Math.max(newDueAmount, 0),
                hasOverDue: overDue,
                status: updateStatus
            }
        });

        const extraAmount = Math.max(-newDueAmount, 0);
        if (extraAmount > 0 && feePayment.studentTermFee?.student) {
            await transaction.student.update({
                where: { id: feePayment.studentTermFee.student.id },
                data: {
                    creditBalance: { increment: extraAmount },
                    hasOverDue: overDue
                }
            });
        }

        const updatedInstallment = await transaction.paymentInstallment.findUnique({
            where: { id: +paymentInstallmentId },
            include: { feePayment: true }
        });

        return {
            paymentInstallment: updatedInstallment,
            newDueAmount: Math.max(newDueAmount, 0),
            extraAmount
        };
    });
}
/*get invoice data for generating invoice*/

export async function fetchFeePaymentByIdForInvoice(feePaymentId: string) {
    // AUTO-CREDIT DISABLED (2026-06): see findFeePaymentById above. Apply credit manually only. docs/gotchas.md.
    // await autoApplyCreditToFeePayment(feePaymentId);
    const feePayment = await db.feePayment.findUnique({
        where: { id: parseInt(feePaymentId) },
        include: {
            feeTemplate: true, // Assuming you might want to include related data like feeTemplate
            studentTermFee: {
                include: {
                    student: {
                        include: {
                            personalDetails: true
                        }
                    },
                    term: true
                }
            },
            paymentInstallment: true // Include details about payment installments if needed
        }
    });
    const overDueFeePayments = await db.feePayment.findMany({
        where: {
            status: 'OVERDUE',
            id: {
                lte: +feePaymentId
            },
            studentTermFee: {
                student: {
                    id: feePayment?.studentTermFee?.student.id
                }
            }
        },
        include: {
            feeTemplate: true, // Assuming you might want to include related data like feeTemplate
            studentTermFee: {
                include: {
                    student: {
                        include: {
                            personalDetails: true
                        }
                    },
                    term: true
                }
            },
            paymentInstallment: true // Include details about payment installments if needed
        }
    });

    return { feePayment, overDueFeePayments };
}

/*-----------------fee-----------------------*/
export async function findActiveStudentEnrolledSubjects(studentId: string, termId: string) {
    // Fetch all enrollments for the student
    const enrollments = await db.enrollment.findMany({
        where: {
            studentId: parseInt(studentId),
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

// Annotate each section of a term with `isFromOldTermOnly`: true when the section is a
// stale leftover — one that got re-linked to the current term (sections are shared by
// name) but was never actually set up for this term. Such sections are hidden from the
// assign-class dropdown.
//
// A section counts as intended-for-this-term (and therefore stays visible) if EITHER:
//   - it already has a student assigned in this term's TermSubjectLevel, OR
//   - it is scheduled in this term's timetable (a TimetableSlot on this term's TSL).
// The timetable check is essential: an admin can add a brand-new section to the current
// term's timetable and then assign students to it — at that point it has 0 students yet
// but IS deliberately part of the term, so it must not be hidden. (Without this check the
// student-count-only heuristic wrongly hid freshly re-created sections like "ਪੰਜਾਬੀ ਰਾਵੀ 4".)
//
// Only sections that are intended for NEITHER (no students this term, not on this term's
// timetable) but DO have students in another term are treated as leftovers. A genuinely
// new, still-empty section has no students anywhere, so it also stays visible.
type TermWithSections = {
    id: number;
    termSubjectLevel: { id: number; sections: { id: number; name: string }[] }[];
};
const annotateOldTermSections = async <T extends TermWithSections>(term: T) => {
    const currentTslIds = term.termSubjectLevel.map((tsl) => tsl.id);
    const allSectionIds = [
        ...new Set(term.termSubjectLevel.flatMap((tsl) => tsl.sections.map((s) => s.id)))
    ];

    const [activeThisTermRows, scheduledThisTermRows, oldTermRows] = await Promise.all([
        db.studentClassAssignment.findMany({
            where: { termSubjectLevelId: { in: currentTslIds } },
            select: { termSubjectLevelId: true, sectionId: true }
        }),
        db.timetableSlot.findMany({
            where: {
                termSubjectLevelId: { in: currentTslIds },
                sectionId: { in: allSectionIds },
                // Only the LIVE timetable counts. Editing a day's timetable leaves the
                // previous version behind as an inactive Timetable whose slots still
                // point at sections that were dropped — without this, those retired
                // sections looked "scheduled this term" and stayed in the dropdown.
                timetable: { isActive: true }
            },
            select: { termSubjectLevelId: true, sectionId: true }
        }),
        db.studentClassAssignment.findMany({
            where: {
                sectionId: { in: allSectionIds },
                termSubjectLevel: { termId: { not: term.id } }
            },
            select: { sectionId: true }
        })
    ]);

    const activeThisTerm = new Set(activeThisTermRows.map((r) => `${r.termSubjectLevelId}:${r.sectionId}`));
    const scheduledThisTerm = new Set(
        scheduledThisTermRows
            .filter((r) => r.termSubjectLevelId != null && r.sectionId != null)
            .map((r) => `${r.termSubjectLevelId}:${r.sectionId}`)
    );
    const oldTermSectionIds = new Set(oldTermRows.map((r) => r.sectionId));

    return {
        ...term,
        termSubjectLevel: term.termSubjectLevel.map((tsl) => ({
            ...tsl,
            sections: tsl.sections.map((section) => ({
                ...section,
                isFromOldTermOnly:
                    !activeThisTerm.has(`${tsl.id}:${section.id}`) &&
                    !scheduledThisTerm.has(`${tsl.id}:${section.id}`) &&
                    oldTermSectionIds.has(section.id)
            }))
        }))
    };
};

// find current term for assign classes to active students
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
                        select: { name: true, id: true }
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

    return annotateOldTermSections(currentTerm);
};

//find current term for assign classes to active students based on ID
export const findCurrentTermToAssignClassById = async (id: string) => {
    const currentTerm = await db.term.findFirst({
        where: {
            id: +id
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
                        select: { name: true, id: true }
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

    return annotateOldTermSections(currentTerm);
};

/****** * assign class to student*****/
export async function assignClassToStudent(studentId: string, termId: string, subjectName: string, levelName: string, sectionName: string) {
    // Find Subject ID
    const subject = await db.subject.findUnique({
        where: {
            name: subjectName
        }
    });

    if (!subject) {
        throw customError(`Subject not found: ${subjectName}`, 'fail', 404, true);
    }

    // Find TermSubjectLevel ID
    const termSubjectLevel = await db.termSubjectLevel.findFirst({
        where: {
            termId: +termId,
            subjectId: subject.id,
            level: {
                name: levelName
            }
        }
    });

    if (!termSubjectLevel) {
        throw customError(`TermSubjectLevel not found for ${subjectName} in ${levelName}`, 'fail', 404, true);
    }
    // Find the Section
    let section = await db.section.findFirst({
        where: {
            name: sectionName
        }
    });
    if (!section) {
        throw customError(`section not found for ${subjectName} in ${levelName}`, 'fail', 404, true);
    }
    const sectionId = section.id;
    // console.log(section);
    // Find SubjectEnrollment and Enrollment ID
    const subjectEnrollment = await db.subjectEnrollment.findFirst({
        where: {
            termSubject: {
                subjectId: subject.id,
                termId: +termId
            },
            enrollment: {
                studentId: +studentId
            }
        },
        include: {
            enrollment: true // This includes the enrollment data
        }
    });

    if (!subjectEnrollment || !subjectEnrollment.enrollment) {
        throw customError(`Enrollment not found for student ${studentId} in subject ${subjectName}`, 'fail', 404, true);
    }

    // Deactivate any other section assignment for this student in the same termSubjectLevel
    // so only one "current" section exists per (student, termSubjectLevel)
    await db.studentClassAssignment.updateMany({
        where: {
            enrollmentId: subjectEnrollment.enrollment.id,
            termSubjectLevelId: termSubjectLevel.id,
            studentId: +studentId,
            sectionId: { not: sectionId },
            isCurrentlyAssigned: true
        },
        data: {
            isCurrentlyAssigned: false
        }
    });

    const now = new Date();
    // Find or create StudentClassAssignment for the target section
    const existingRecord = await db.studentClassAssignment.findFirst({
        where: {
            enrollmentId: subjectEnrollment.enrollment.id,
            termSubjectLevelId: termSubjectLevel.id,
            studentId: +studentId,
            sectionId
        }
    });

    let assignmentId: number;
    if (existingRecord) {
        await db.studentClassAssignment.update({
            where: { id: existingRecord.id },
            data: {
                isCurrentlyAssigned: true,
                sectionId,
                changeDate: now
            }
        });
        assignmentId = existingRecord.id;
    } else {
        const newAssignment = await db.studentClassAssignment.create({
            data: {
                enrollmentId: subjectEnrollment.enrollment.id,
                termSubjectLevelId: termSubjectLevel.id,
                studentId: +studentId,
                isCurrentlyAssigned: true,
                sectionId,
                changeDate: now
            }
        });
        assignmentId = newAssignment.id;
    }

    await db.enrollment.update({
        where: {
            id: subjectEnrollment.enrollment.id
        },
        data: {
            termSubjectLevelId: termSubjectLevel.id
        }
    });

    // Same-day: if report was already generated today, create ClassAttendance for the new section
    // so the student shows up in the new section on the same day
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const schoolDayRecord = await db.schoolDay.findFirst({
        where: {
            schoolOperatedDate: todayStart
        }
    });

    if (schoolDayRecord) {
        const existingCheckIn = await db.schoolCheckInAttendance.findFirst({
            where: {
                studentId: +studentId,
                date: { gte: todayStart, lte: todayEnd }
            }
        });

        if (existingCheckIn) {
            const leaveRecord = await db.leave.findFirst({
                where: {
                    studentId: +studentId,
                    startDate: { lte: todayEnd },
                    endDate: { gte: todayStart },
                    status: 'APPROVED'
                }
            });
            const attendanceStatus = leaveRecord ? 'LEAVE' : 'ABSENT';

            const existingClassAttendance = await db.classAttendance.findUnique({
                where: {
                    studentClassAssignmentId_date: {
                        studentClassAssignmentId: assignmentId,
                        date: todayStart
                    }
                }
            });

            if (!existingClassAttendance) {
                await db.classAttendance.create({
                    data: {
                        studentClassAssignmentId: assignmentId,
                        date: todayStart,
                        schoolCheckInAttendanceId: existingCheckIn.id,
                        attendanceStatus,
                        schoolDayId: schoolDayRecord.id
                    }
                });
            }
        }
    }

    return { message: 'Class assigned successfully' };
}

export async function createAttendanceForSingleStudent(studentId: string, date: string) {
    try {
        const transaction = await db.$transaction(
            async (db) => {
                // Get current day and term
                const currentDay = new Date().toLocaleString('en-us', { weekday: 'long' }).toUpperCase() as unknown as Day;
                const currentTerm = await db.term.findFirst({
                    where: { currentTerm: true }
                });

                // Get active timetable
                const activeTimetable = await db.timetable.findFirst({
                    where: {
                        day: currentDay,
                        isActive: true
                    }
                });

                if (!activeTimetable) {
                    throw customError('No active timetable found for today', 'fail', 404, true);
                }

                // Get timetable slots
                const allTimetableSlots = await db.timetableSlot.findMany({
                    where: { timetableId: activeTimetable.id },
                    select: {
                        termSubjectLevelId: true,
                        sectionId: true
                    }
                });

                const timetableSlots = allTimetableSlots.filter((slot) => slot.termSubjectLevelId !== null && slot.sectionId !== null);

                if (timetableSlots.length === 0) {
                    throw customError('No classes scheduled in timetable for today', 'fail', 400, true);
                }

                // Get student data
                const student = await db.student.findFirst({
                    where: {
                        id: +studentId,
                        role: 'STUDENT',
                        isActive: true,
                        studentTermFee: {
                            some: { termId: currentTerm?.id }
                        },
                        studentClassAssignment: {
                            some: {
                                OR: timetableSlots.map((slot) => ({
                                    AND: [{ termSubjectLevelId: slot.termSubjectLevelId ?? undefined }, { sectionId: slot.sectionId ?? undefined }]
                                }))
                            }
                        }
                    },
                    include: {
                        studentClassAssignment: {
                            where: { isCurrentlyAssigned: true },
                            include: {
                                termSubjectLevel: true,
                                section: true
                            }
                        }
                    }
                });

                if (!student) {
                    throw customError('Student not found or not active', 'fail', 404, true);
                }

                // Set up date range
                const startDate = new Date(date);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(date);
                endDate.setHours(23, 59, 59, 999);

                // Get or create school day record
                let schoolDayRecord = await db.schoolDay.findFirst({
                    where: { schoolOperatedDate: startDate }
                });

                if (!schoolDayRecord) {
                    schoolDayRecord = await db.schoolDay.create({
                        data: { schoolOperatedDate: startDate }
                    });
                }

                // Check for existing attendance
                const existingAttendance = await db.schoolCheckInAttendance.findFirst({
                    where: {
                        studentId: student.id,
                        date: {
                            gte: startDate,
                            lte: endDate
                        }
                    }
                });

                if (existingAttendance) {
                    throw customError('Attendance already exists for this student today', 'fail', 400, true);
                }

                // Check for leave
                const leaveRecord = await db.leave.findFirst({
                    where: {
                        studentId: student.id,
                        startDate: { lte: new Date(date) },
                        endDate: { gte: new Date(date) },
                        status: 'APPROVED'
                    }
                });

                const isOnLeave = !!leaveRecord;
                const attendanceStatus = leaveRecord ? 'LEAVE' : 'ABSENT';

                // Create new attendance record
                const recentAttendanceRecords = await db.schoolCheckInAttendance.findMany({
                    where: { studentId: student.id, isOnLeave: false },
                    orderBy: { date: 'desc' },
                    take: 2
                });

                let newAttendanceValue = 0;
                const countMarkedAndCheckedIn = recentAttendanceRecords.filter((record) => record.isMarked && record.checkedIn).length;

                if (countMarkedAndCheckedIn === 2) newAttendanceValue = 2;
                else if (countMarkedAndCheckedIn === 1) newAttendanceValue = 1;

                const newAttendanceRecord = await db.schoolCheckInAttendance.create({
                    data: {
                        studentId: student.id,
                        date: new Date(date),
                        schoolDayId: schoolDayRecord?.id,
                        attendanceValue: newAttendanceValue,
                        isOnLeave
                    }
                });

                // Create class attendance records
                const studentClassAssignments = await db.studentClassAssignment.findMany({
                    where: {
                        studentId: student.id,
                        isCurrentlyAssigned: true,
                        termSubjectLevel: {
                            termId: currentTerm?.id
                        },
                        OR: timetableSlots.map((slot) => ({
                            AND: [{ termSubjectLevelId: slot.termSubjectLevelId ?? undefined }, { sectionId: slot.sectionId ?? undefined }]
                        }))
                    }
                });

                await Promise.all(
                    studentClassAssignments.map(async (assignment) => {
                        return db.classAttendance.create({
                            data: {
                                studentClassAssignmentId: assignment.id,
                                date: startDate,
                                schoolCheckInAttendanceId: newAttendanceRecord.id,
                                attendanceStatus: attendanceStatus,
                                schoolDayId: schoolDayRecord?.id
                            }
                        });
                    })
                );

                await updateStudentLastTwoDaysAttendance(db, student.id);
                return newAttendanceRecord;
            },
            { timeout: 30000 }
        );

        return transaction;
    } catch (error: any) {
        console.error('Error creating attendance:', error);
        if (error.message.includes('already exists')) {
            throw customError(error.message, 'fail', 400, true);
        }
        throw customError('Failed to create attendance. Please try again.', 'error', 500, true);
    }
}

/****** * remove/ deactivate class for student (soft-delete to preserve attendance history) *****/
export async function deleteClassAssignment(id: string) {
    // Check if the class assignment exists. The subject/level/section come along so the
    // caller can record WHICH class was removed in the activity log — logging only the
    // assignment id left admins with "Class/section assignment removed" and no idea what.
    const classAssignment = await db.studentClassAssignment.findUnique({
        where: {
            id: +id
        },
        include: {
            section: { select: { name: true } },
            termSubjectLevel: {
                select: {
                    subject: { select: { name: true } },
                    level: { select: { name: true } }
                }
            }
        }
    });

    if (!classAssignment) {
        throw new Error('Class assignment not found with the given ID.');
    }

    const studentId = classAssignment.studentId;

    // Soft-delete: deactivate the assignment so attendance records are preserved
    await db.studentClassAssignment.update({
        where: {
            id: +id
        },
        data: {
            isCurrentlyAssigned: false,
            changeDate: new Date()
        }
    });

    return {
        message: 'Class assignment deleted successfully',
        studentId,
        subjectName: classAssignment.termSubjectLevel?.subject?.name ?? null,
        levelName: classAssignment.termSubjectLevel?.level?.name ?? null,
        sectionName: classAssignment.section?.name ?? null
    };
}

/****** migrate ClassAttendance records from a deactivated assignment to the new active one *****/
export async function migrateClassAttendance(fromAssignmentId: string, toAssignmentId: string) {
    const [fromAssignment, toAssignment] = await Promise.all([
        db.studentClassAssignment.findUnique({ where: { id: +fromAssignmentId }, include: { classAttendance: true } }),
        db.studentClassAssignment.findUnique({ where: { id: +toAssignmentId } }),
    ]);

    if (!fromAssignment) throw customError('Source assignment not found', 'fail', 404, true);
    if (!toAssignment) throw customError('Target assignment not found', 'fail', 404, true);
    if (fromAssignment.studentId !== toAssignment.studentId) throw customError('Assignments belong to different students', 'fail', 400, true);
    if (fromAssignment.termSubjectLevelId !== toAssignment.termSubjectLevelId) throw customError('Assignments are for different subjects/levels', 'fail', 400, true);

    if (fromAssignment.migratedToAssignmentId !== null) {
        return { alreadyMigrated: true, migratedToAssignmentId: fromAssignment.migratedToAssignmentId, migratedAt: fromAssignment.migratedAt };
    }

    const existingDates = new Set(
        (await db.classAttendance.findMany({
            where: { studentClassAssignmentId: +toAssignmentId },
            select: { date: true },
        })).map((r) => r.date.toISOString())
    );

    let migrated = 0;
    let skipped = 0;
    for (const record of fromAssignment.classAttendance) {
        if (existingDates.has(record.date.toISOString())) {
            skipped++;
        } else {
            await db.classAttendance.update({
                where: { id: record.id },
                data: { studentClassAssignmentId: +toAssignmentId },
            });
            migrated++;
        }
    }

    await db.studentClassAssignment.update({
        where: { id: +fromAssignmentId },
        data: { migratedToAssignmentId: +toAssignmentId, migratedAt: new Date() },
    });

    return { alreadyMigrated: false, migrated, skipped, migratedToAssignmentId: +toAssignmentId };
}

/*get all classes for students*/
export async function findUniqueStudentClassDetails(studentId: string, termId: string) {
    const studentClassAssignmentRecords = await db.studentClassAssignment.findMany({
        where: {
            studentId: +studentId,
            termSubjectLevel: {
                termId: +termId
            }
        },
        include: {
            termSubjectLevel: {
                include: {
                    subject: true,
                    level: true
                }
            },
            section: {
                select: {
                    name: true
                }
            }
        },
        orderBy: {
            id: 'desc'
        }
    });

    return studentClassAssignmentRecords;
}
/*Manage classes for students*/
export async function manageClasses(id: string) {
    const currentRecord = await db.studentClassAssignment.findUnique({
        where: { id: +id }
    });
    const updatedStudentClassAsstudentClassAssignmentRecords = await db.studentClassAssignment.update({
        where: { id: +id },
        data: { isCurrentlyAssigned: !currentRecord?.isCurrentlyAssigned }
    });
    return updatedStudentClassAsstudentClassAssignmentRecords;
}
/*enroll subjects to active students*/
export async function enrollActiveStudent(enrollData: ActiveStudentEnrollDataSchema['body']) {
    let alreadyEnrolledSubjects = [];

    for (const enrollmentItem of enrollData.enrollData) {
        const existingEnrollments = await db.enrollment.findMany({
            where: { studentId: enrollData.activeStudentId, termSubjectGroupId: enrollmentItem.termSubjectGroupId },
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
                studentId: enrollData.activeStudentId,
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
                        studentId: enrollData.activeStudentId,
                        termSubjectGroupId: termSubjectGroupId,
                        termId: feeInfo.termId
                    }
                },
                update: {},
                create: {
                    studentId: enrollData.activeStudentId,
                    termSubjectGroupId: termSubjectGroupId,
                    termId: feeInfo.termId
                },
                select: { id: true }
            });
            await db.student.update({
                where: { id: enrollData.activeStudentId },
                data: { isAllowedLogin: true }
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

/* de-enroll active student to subjects */
export async function deEnrollActiveStudent(deEnrollData: ActiveStudentEnrollDataSchema['body']) {
    // Check total number of subjects enrolled in the term
    const termId = deEnrollData.enrollData[0].termId;
    const totalEnrollments = await db.enrollment.count({
        where: {
            studentId: deEnrollData.activeStudentId,
            termSubjectGroup: {
                termId: +termId
            }
        }
    });

    // if (totalEnrollments <= deEnrollData.enrollData.length) {
    //     throw customError('The student must be enrolled in at least one subject.', 'fail', 400, true);
    // }

    let deEnrolledSubjects = [];

    for (const deEnrollItem of deEnrollData.enrollData) {
        // Find the SubjectEnrollment record
        const subjectEnrollment = await db.subjectEnrollment.findFirst({
            where: {
                termSubjectId: deEnrollItem.termSubjectId,
                enrollment: {
                    studentId: deEnrollData.activeStudentId,
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

        // Do not delete StudentTermFee or FeePayment when de-enrolling. Preserve fee history and due fees.

        // // Check for remaining enrollments in the same TermSubjectGroup
        // const remainingEnrollments = await db.enrollment.count({
        //     where: {
        //         studentId: deEnrollData.activeStudentId,
        //         termSubjectGroupId: deEnrollItem.termSubjectGroupId
        //     }
        // });

        // // If no remaining enrollments, handle StudentTermFee and FeePayment records
        // if (remainingEnrollments === 0) {
        //     const studentTermFee = await db.studentTermFee.findFirst({
        //         where: {
        //             studentId: deEnrollData.activeStudentId,
        //             termSubjectGroupId: deEnrollItem.termSubjectGroupId,
        //             termId: deEnrollItem.termId
        //         }
        //     });

        //     if (studentTermFee) {
        //         // Delete associated FeePayment records
        //         await db.feePayment.deleteMany({
        //             where: { studentTermFeeId: studentTermFee.id }
        //         });

        //         // Delete the StudentTermFee record
        //         await db.studentTermFee.delete({
        //             where: { id: studentTermFee.id }
        //         });
        //     }
        // }

        deEnrolledSubjects.push(deEnrollItem.subject);
    }

    return {
        message: 'De-enrollment process completed',
        deEnrolledSubjects
    };
}

// find term to enroll
export async function findTermToEnrollActiveStudent() {
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
// last two schoolattendanace
export async function fetchRecentSchoolAttendanceForStudent(studentId: string) {
    const attendanceRecords = await db.schoolCheckInAttendance.findMany({
        where: {
            studentId: +studentId
        },
        orderBy: {
            date: 'desc'
        },
        take: 2
    });

    if (!attendanceRecords) {
        throw customError('Attendance records not found for the student.', 'fail', 404, true);
    }

    return attendanceRecords;
}

// Leave
export async function createLeaveApplication(studentId: string, appliedById: string, appliedByRole: string, startDate: string, endDate: string, reason: string, status: string, comments: string) {
    const formattedStartDate = new Date(startDate);
    formattedStartDate.setHours(0, 0, 0, 0); // Set start date to beginning of the day

    const formattedEndDate = new Date(endDate);
    formattedEndDate.setHours(23, 59, 59, 999); // Set end date to end of the day
    const existingLeave = await db.leave.findFirst({
        where: {
            studentId: +studentId,
            NOT: [{ endDate: { lt: formattedStartDate } }, { startDate: { gt: formattedEndDate } }]
        }
    });

    if (existingLeave) {
        throw customError('A leave application already exists within the specified date range', 'fail', 400, true);
    }
    const leaveApplication = await db.leave.create({
        data: {
            studentId: +studentId,
            appliedById: +appliedById,
            appliedByRole: appliedByRole === 'ADMIN' ? 'ADMIN' : 'STUDENT',
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            comments,
            reason: reason,
            status: status === 'APPROVED' ? 'APPROVED' : status === 'DECLINED' ? 'DECLINED' : 'PENDING',
            approvedOn: status === 'APPROVED' ? new Date() : null,
            approverId: status === 'APPROVED' ? +appliedById : null
        }
    });
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const currentEndDate = new Date();
    currentEndDate.setHours(23, 59, 59, 999);
    if (formattedStartDate <= currentEndDate && formattedEndDate >= currentDate && status === 'APPROVED') {
        // Find the schoolCheckInAttendance record for the current day
        const schoolAttendanceRecord = await db.schoolCheckInAttendance.findFirst({
            where: {
                studentId: +studentId,
                date: {
                    gte: currentDate,
                    lte: currentEndDate
                }
            }
        });

        if (schoolAttendanceRecord) {
            await db.schoolCheckInAttendance.update({
                where: {
                    id: schoolAttendanceRecord.id
                },
                data: {
                    isOnLeave: true
                }
            });
            await updateStudentLastTwoDaysAttendance(db, +studentId);
        }

        // Find and update classAttendance records for the current day
        const classAttendanceRecords = await db.classAttendance.findMany({
            where: {
                studentClassAssignment: {
                    studentId: +studentId
                },
                date: currentDate
            }
        });

        classAttendanceRecords.forEach(async (record) => {
            await db.classAttendance.update({
                where: {
                    id: record.id
                },
                data: {
                    attendanceStatus: 'LEAVE'
                }
            });
        });
    }
    const io = getIo();
    io.emit('LeaveMarked', {
        studentId: studentId,
        status: 'onLeave',
        date: new Date()
    });
    return leaveApplication;
}

export async function updateLeaveApplication(leaveId: string, updatedById: string, reason: string, comments = '', status: string, startDate: string, endDate: string) {
    const formattedStartDate = new Date(startDate);
    formattedStartDate.setHours(0, 0, 0, 0); // Set start date to beginning of the day

    const formattedEndDate = new Date(endDate);
    formattedEndDate.setHours(23, 59, 59, 999); // Set end date to end of the day
    const currentLeave = await db.leave.findUnique({ where: { id: +leaveId } });
    if (!currentLeave) {
        throw customError('Leave application not found.', 'fail', 400, true);
    }
    const overlappingLeave = await db.leave.findFirst({
        where: {
            AND: [
                { id: { not: +leaveId } },
                { studentId: currentLeave.studentId },
                {
                    NOT: [{ endDate: { lt: formattedStartDate } }, { startDate: { gt: formattedEndDate } }]
                }
            ]
        }
    });

    if (overlappingLeave) {
        throw customError('Another leave application already exists within the specified date range.', 'fail', 400, true);
    }
    const updatedLeaveApplication = await db.leave.update({
        where: { id: +leaveId },
        data: {
            comments,
            reason: reason,
            status: status === 'APPROVED' ? 'APPROVED' : status === 'DECLINED' ? 'DECLINED' : 'PENDING',
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            approvedOn: status === 'APPROVED' ? new Date() : null,
            approverId: status === 'APPROVED' ? +updatedById : null
        }
    });
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const currentEndDate = new Date();
    currentEndDate.setHours(23, 59, 59, 999);

    // console.log("ioutside'");
    // console.log(formattedStartDate, currentEndDate);
    // console.log(formattedEndDate, currentDate);
    // console.log(status);

    const isCurrentDateWithinLeave = formattedStartDate <= currentEndDate && formattedEndDate >= currentDate;

    // Update the schoolCheckInAttendance and classAttendance records based on the condition
    const schoolAttendanceRecord = await db.schoolCheckInAttendance.findFirst({
        where: {
            studentId: currentLeave.studentId,
            date: {
                gte: currentDate,
                lte: currentEndDate
            }
        }
    });

    if (schoolAttendanceRecord) {
        await db.schoolCheckInAttendance.update({
            where: {
                id: schoolAttendanceRecord.id
            },
            data: {
                isOnLeave: isCurrentDateWithinLeave && status === 'APPROVED'
            }
        });
        await updateStudentLastTwoDaysAttendance(db, schoolAttendanceRecord.studentId);
    }

    const classAttendanceRecords = await db.classAttendance.findMany({
        where: {
            studentClassAssignment: {
                studentId: currentLeave.studentId
            },
            date: currentDate
        }
    });

    for (const record of classAttendanceRecords) {
        await db.classAttendance.update({
            where: {
                id: record.id
            },
            data: {
                attendanceStatus: isCurrentDateWithinLeave && status === 'APPROVED' ? 'LEAVE' : 'ABSENT'
            }
        });
    }
    const io = getIo();
    io.emit('LeaveMarked', {
        leaveId: leaveId,
        status: 'onLeave',
        date: new Date()
    });
    return updatedLeaveApplication;
}

export async function deleteLeaveApplication(leaveId: string) {
    const leaveApplication = await db.leave.findUnique({
        where: { id: +leaveId },
        select: {
            studentId: true,
            startDate: true,
            endDate: true
        }
    });

    if (!leaveApplication) {
        throw customError('Leave application not found.', 'fail', 400, true);
    }

    const { studentId, startDate, endDate } = leaveApplication;
    const formattedStartDate = new Date(startDate);
    formattedStartDate.setHours(0, 0, 0, 0);
    const formattedEndDate = new Date(endDate);
    formattedEndDate.setHours(23, 59, 59, 999);

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const currentEndDate = new Date();
    currentEndDate.setHours(23, 59, 59, 999);

    const isCurrentDateWithinLeave = formattedStartDate <= currentEndDate && formattedEndDate >= currentDate;

    // Update schoolCheckInAttendance and classAttendance if current date is within leave period
    if (isCurrentDateWithinLeave) {
        const schoolAttendanceRecord = await db.schoolCheckInAttendance.findFirst({
            where: {
                studentId: studentId,
                date: {
                    gte: currentDate,
                    lte: currentEndDate
                }
            }
        });

        if (schoolAttendanceRecord) {
            await db.schoolCheckInAttendance.update({
                where: {
                    id: schoolAttendanceRecord.id
                },
                data: {
                    isOnLeave: false
                }
            });
            await updateStudentLastTwoDaysAttendance(db, studentId);
        }

        const classAttendanceRecords = await db.classAttendance.findMany({
            where: {
                studentClassAssignment: {
                    studentId: studentId
                },
                date: currentDate
            }
        });

        for (const record of classAttendanceRecords) {
            await db.classAttendance.update({
                where: {
                    id: record.id
                },
                data: {
                    attendanceStatus: 'ABSENT'
                }
            });
        }
    }

    // Finally, delete the leave application
    await db.leave.delete({
        where: { id: +leaveId }
    });
}

export async function fetchLeavesForStudent(studentId: number) {
    const leaveApplications = await db.leave.findMany({
        where: { studentId: studentId },
        orderBy: { createdAt: 'desc' }
    });

    return leaveApplications;
}
export async function findLeaveById(leaveId: number) {
    const leaveApplication = await db.leave.findUnique({
        where: { id: leaveId }
    });

    if (!leaveApplication) {
        throw customError('Leave application not found', 'fail', 400, true);
    }

    return leaveApplication;
}

export async function findStudentAttendanceById1(studentId: string) {
    const attendance = await db.student.findUnique({
        where: { id: +studentId },

        include: {
            schoolCheckInAttendance: {
                include: { classAttendance: true },
                orderBy: {
                    date: 'desc'
                }
            },
            personalDetails: true
        }
    });

    if (!attendance) {
        throw new Error(`No attendance records found for student with ID ${studentId}`);
    }

    return attendance;
}
export async function findStudentAttendanceById(studentId: string, termId: string) {
    const selectedTerm = await db.term.findUnique({
        where: {
            id: +termId
        }
    });

    const attendance = await db.schoolCheckInAttendance.findMany({
        where: {
            student: {
                id: +studentId
            },
            //
            date: {
                gte: selectedTerm?.startDate
            }
        },

        include: {
            student: {
                include: {
                    personalDetails: true
                }
            },
            classAttendance: {
                orderBy: {
                    id: 'desc'
                },
                include: {
                    studentClassAssignment: {
                        include: {
                            section: true,
                            termSubjectLevel: {
                                include: {
                                    level: true,
                                    subject: true
                                }
                            }
                        }
                    }
                }
            }
        },
        orderBy: {
            date: 'desc'
        }
    });

    if (!attendance) {
        throw new Error(`No attendance records found for student with ID ${studentId}`);
    }

    return attendance;
}

export async function alumniStudentById(studentId: string, remarks: string) {
    const student = await db.student.update({
        where: { id: parseInt(studentId) },
        data: {
            role: 'ALUMNI',
            isActive: false,
            isAllowedLogin: false,
            attendancePercentageValue: 0,
            termAttendance: 0
        }
    });

    if (!student) {
        throw customError(`No student found with ID ${studentId}`, 'fail', 400, true);
    }
    await db.alumniRemarks.create({
        data: {
            studentId: parseInt(studentId),
            remarks
        }
    });

    return student;
}

export async function markPresentByEditSchoolCheckInAttendanceForStudent(studentId: string, date: string, remarks?: string) {
    const currentDate = new Date(date);
    currentDate.setHours(0, 0, 0, 0); // Set time to start of the day

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999); // Set time to end of the day

    // Find the SchoolCheckInAttendance record for the specified student and date
    const attendanceRecord = await db.schoolCheckInAttendance.findFirst({
        where: {
            studentId: +studentId,

            date: {
                gte: currentDate,
                lte: endDate
            }
        }
    });

    if (!attendanceRecord) {
        throw customError('Attendance record not found for today.', 'fail', 404, true);
    }

    // Update the check-in time, set checkedIn to true, and mark attendance
    const updatedAttendanceRecord = await db.schoolCheckInAttendance.update({
        where: {
            id: attendanceRecord.id
        },
        data: {
            checkInTime: new Date(),
            checkedIn: true,
            remarks: remarks || null,
            isMarked: true,
            checkOutTime: new Date(),
            isCheckedOut: true
        }
    });

    // If SchoolCheckInAttendance update is successful, update ClassAttendance records
    const updatedClassAttendanceRecords = await db.classAttendance.updateMany({
        where: {
            schoolCheckInAttendanceId: updatedAttendanceRecord.id,
            date: {
                gte: currentDate,
                lte: endDate
            },
            attendanceStatus: 'ABSENT' // Only update if previously marked as ABSENT
        },
        data: {
            attendanceStatus: 'PRESENT'
        }
    });

    // Retrieve the most recent 2 records to calculate new attendance value
    const recentAttendanceRecords = await db.schoolCheckInAttendance.findMany({
        where: { studentId: +studentId, isOnLeave: false },
        orderBy: { date: 'desc' },
        take: 2
    });
    let newAttendanceValue = 0;
    const countMarkedAndCheckedIn = recentAttendanceRecords.filter((record) => record.isMarked && record.checkedIn).length;

    if (countMarkedAndCheckedIn === 2) {
        newAttendanceValue = 2; // Both records have isMarked and checkedIn true
    } else if (countMarkedAndCheckedIn === 1) {
        newAttendanceValue = 1; // One of the records has isMarked and checkedIn true
    }

    const finalAttendanceUpdate = await db.schoolCheckInAttendance.update({
        where: {
            id: updatedAttendanceRecord.id
        },
        data: {
            attendanceValue: newAttendanceValue
        }
    });
    await updateStudentLastTwoDaysAttendance(db, +studentId);
    return finalAttendanceUpdate;
}
export async function markAbsentByEditSchoolCheckInAttendanceForStudent(studentId: string, date: string, remarks?: string) {
    const currentDate = new Date(date);
    currentDate.setHours(0, 0, 0, 0); // Set time to start of the day

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999); // Set time to end of the day

    // Find the SchoolCheckInAttendance record for the specified student and date
    const attendanceRecord = await db.schoolCheckInAttendance.findFirst({
        where: {
            studentId: +studentId,
            date: {
                gte: currentDate,
                lte: endDate
            },
            isMarked: true, // targeting records not yet marked for today
            checkedIn: true
        }
    });

    if (!attendanceRecord) {
        throw customError('Attendance record not found or already marked for today.', 'fail', 404, true);
    }

    const updatedSchoolAttendance = await db.schoolCheckInAttendance.update({
        where: {
            id: attendanceRecord.id
        },
        data: {
            checkedIn: false,
            isCheckedOut: false,
            checkInTime: null,
            checkOutTime: null,
            remarks: remarks || null,
            isMarked: false
        }
    });
    await updateStudentLastTwoDaysAttendance(db, +studentId);

    // Update related ClassAttendance records to mark them as 'ABSENT'
    const updatedClassAttendanceRecords = await db.classAttendance.updateMany({
        where: {
            schoolCheckInAttendanceId: updatedSchoolAttendance.id,
            date: {
                gte: currentDate,
                lte: endDate
            }
        },
        data: {
            attendanceStatus: 'ABSENT'
        }
    });

    return {
        updatedSchoolAttendance,
        updatedClassAttendanceRecords
    };
}

export async function updateStudentCreditBalance(studentId: string, amount: string) {
    try {
        const updatedStudent = await db.student.update({
            where: { id: +studentId },
            data: {
                creditBalance: +amount
            },
            select: {
                id: true,
                akaalId: true,
                creditBalance: true,
                personalDetails: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        if (!updatedStudent) {
            throw customError('Student not found', 'fail', 404, true);
        }

        return {
            message: 'Credit balance updated successfully',
            student: updatedStudent
        };
    } catch (error) {
        console.error('Error updating student credit balance:', error);
        throw customError('Failed to update credit balance', 'error', 500, true);
    }
}

export async function getActiveStudentsCount() {
    const studentsCount = await db.student.count({
        where: {
            role: 'STUDENT',
            isActive: true,
            studentTermFee: {
                none: {
                    term: {
                        currentTerm: true
                    }
                }
            }
        }
    });
    return studentsCount;
}

/**
 * Global student search across ALL students regardless of role/isActive/term.
 * Covers active STUDENTs, ALUMNI, APPLICANT and WAITLISTED. Searches student name,
 * parent names, email/parentEmail, contact/parentContact, address, suburb, postcode,
 * and numeric akaalId / db id. Returns a lightweight payload for a dashboard quick-jump.
 */
export async function searchAllStudents(search = '') {
    const trimmed = search.trim();
    if (!trimmed) {
        return { students: [], count: 0 };
    }

    const take = 30;
    const like = `%${trimmed}%`;
    // space-stripped query, so a glued "EkamSingh" matches firstName "Ekam" + lastName "Singh"
    const noSpace = `%${trimmed.toLowerCase().replace(/\s+/g, '')}%`;
    const searchAsNumber = isNaN(Number(trimmed)) ? null : parseInt(trimmed);

    // Prisma `where` can't concat columns, so we match IDs via raw (parameterised) SQL,
    // then hydrate the payload through Prisma. Covers active STUDENTs, ALUMNI,
    // APPLICANT and WAITLISTED — never ADMIN/TEACHER accounts.
    const numericClause = searchAsNumber !== null ? Prisma.sql`s."akaalId" = ${searchAsNumber} OR s.id = ${searchAsNumber} OR` : Prisma.empty;

    const whereSql = Prisma.sql`
        s.role IN ('STUDENT', 'ALUMNI', 'APPLICANT', 'WAITLISTED')
        AND (
            ${numericClause}
            p."firstName" ILIKE ${like}
            OR p."lastName" ILIKE ${like}
            OR p.email ILIKE ${like}
            OR p.contact ILIKE ${like}
            OR p.address ILIKE ${like}
            OR p.suburb ILIKE ${like}
            OR p.postcode ILIKE ${like}
            OR pa."fatherName" ILIKE ${like}
            OR pa."motherName" ILIKE ${like}
            OR pa."parentEmail" ILIKE ${like}
            OR pa."parentContact" ILIKE ${like}
            OR REPLACE(LOWER(COALESCE(p."firstName", '') || COALESCE(p."lastName", '')), ' ', '') LIKE ${noSpace}
        )`;

    const idRows = await db.$queryRaw<{ id: number }[]>`
        SELECT s.id
        FROM "Student" s
        LEFT JOIN "PersonalDetails" p ON p."studentId" = s.id
        LEFT JOIN "ParentsDetails" pa ON pa."studentId" = s.id
        WHERE ${whereSql}
        ORDER BY s."isActive" DESC, p."firstName" ASC, s.id ASC
        LIMIT ${take}`;

    const countRows = await db.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS count
        FROM "Student" s
        LEFT JOIN "PersonalDetails" p ON p."studentId" = s.id
        LEFT JOIN "ParentsDetails" pa ON pa."studentId" = s.id
        WHERE ${whereSql}`;

    const ids = idRows.map((r) => r.id);
    const count = countRows[0]?.count ?? 0;

    if (ids.length === 0) {
        return { students: [], count };
    }

    const rows = await db.student.findMany({
        where: { id: { in: ids } },
        select: {
            id: true,
            akaalId: true,
            role: true,
            isActive: true,
            personalDetails: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    contact: true,
                    address: true,
                    suburb: true,
                    postcode: true,
                    image: true
                }
            },
            parentsDetails: {
                select: {
                    fatherName: true,
                    motherName: true,
                    parentEmail: true,
                    parentContact: true
                }
            }
        }
    });

    // preserve the ranked order from the raw query (findMany ignores it)
    const orderIndex = new Map(ids.map((id, i) => [id, i]));
    const students = rows.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));

    return { students, count };
}
