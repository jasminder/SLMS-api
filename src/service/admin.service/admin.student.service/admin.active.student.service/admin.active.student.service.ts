import { db } from '../../../../utils/db.server';
import { customError } from '../../../../utils/customError';
import { ActiveStudentEnrollDataSchema } from '../../../../schema/admin.dto/admin.student.dto/admin.active.students.dto/admin.active.students.dto';
import { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { getIo } from '../../../../sockets/socket';

type AttendanceFilter = {
    attendancePercentageValue?: number;
};

/*-----------------Temp-----------------------*/

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

// updateEmailsToLowercase();

/*-----------------Temp-----------------------*/

// Find all active student for the admin
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

    return { activeStudents, count };
}

// search active student for the admin

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

    // Base where condition
    let whereCondition: Prisma.StudentWhereInput = {
        role: 'STUDENT',
        isActive: true,
        attendancePercentageValue: attendanceOption ? +attendanceOption : undefined
    };

    // Only add studentClassAssignment condition if there are filters
    if (classAssignmentFilters.length > 0) {
        whereCondition.studentClassAssignment = {
            some: {
                AND: classAssignmentFilters
            }
        };
    }

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

    const pageNum: number = page ?? 0;
    const skip = pageNum * take;

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
export async function searchActiveStudents1(
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

    if (searchAsNumber) {
        const pageNum: number = page ?? 0;
        const skip = pageNum * take;

        const activeStudents = await db.student.findMany({
            skip,
            take,
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
    }
    if (!searchAsNumber) {
        const pageNum: number = page ?? 0;
        const skip = pageNum * take;

        const activeStudents = await db.student.findMany({
            skip,
            take,
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
export async function searchActiveStudents2(
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
    const searchAsNumber = isNaN(Number(search)) ? undefined : parseInt(search);
    if (searchAsNumber) {
        const pageNum: number = page ?? 0;
        const skip = pageNum * take;

        const activeStudents = await db.student.findMany({
            skip,
            take,
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
                enrollments: {
                    some: {
                        termSubjectLevel: {
                            ...(subjectOption && { subjectId: +subjectOption }),
                            ...(levelOption && { levelId: +levelOption })
                        },
                        ...(sectionOption && {
                            studentClassAssignment: {
                                some: { sectionId: +sectionOption }
                            }
                        })
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
                attendancePercentageValue: attendanceOption ? +attendanceOption : undefined,
                enrollments: {
                    some: {
                        termSubjectLevel: {
                            ...(subjectOption && { subjectId: +subjectOption }),
                            ...(levelOption && { levelId: +levelOption })
                        },
                        ...(sectionOption && {
                            studentClassAssignment: {
                                some: { sectionId: +sectionOption }
                            }
                        })
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
    }
    if (!searchAsNumber) {
        const pageNum: number = page ?? 0;
        const skip = pageNum * take;

        const activeStudents = await db.student.findMany({
            skip,
            take,
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
                enrollments: {
                    some: {
                        termSubjectLevel: {
                            ...(subjectOption && { subjectId: +subjectOption }),
                            ...(levelOption && { levelId: +levelOption })
                        },
                        ...(sectionOption && {
                            studentClassAssignment: {
                                some: { sectionId: +sectionOption }
                            }
                        })
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
                attendancePercentageValue: attendanceOption ? +attendanceOption : undefined,
                enrollments: {
                    some: {
                        termSubjectLevel: {
                            ...(subjectOption && { subjectId: +subjectOption }),
                            ...(levelOption && { levelId: +levelOption })
                        },
                        ...(sectionOption && {
                            studentClassAssignment: {
                                some: { sectionId: +sectionOption }
                            }
                        })
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

//***************************** */

export async function searchActiveStudentsWithNoSubjects(search = '', page: number, termId: number, subjectOption = '', levelOption = '', sectionOption = '', attendanceOption = '') {
    const take = 10;
    const searchAsNumber = isNaN(Number(search)) ? undefined : parseInt(search);
    if (searchAsNumber) {
        const pageNum: number = page ?? 0;
        const skip = pageNum * take;
        const latestAttendanceIdsRaw = (
            await db.student.findMany({
                where: {
                    role: 'STUDENT',
                    isActive: true
                    // ... other conditions as needed
                },
                select: {
                    id: true,
                    schoolCheckInAttendance: {
                        take: 1,
                        orderBy: { date: 'desc' },
                        select: { id: true }
                    }
                }
            })
        ).map((student) => student.schoolCheckInAttendance[0]?.id);
        const latestAttendanceIds = latestAttendanceIdsRaw.filter((id) => id !== undefined);
        const activeStudents = await db.student.findMany({
            skip,
            take,
            orderBy: {
                akaalId: 'desc'
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
        return { activeStudents, count };
    } else if (!searchAsNumber) {
        const pageNum: number = page ?? 0;
        const skip = pageNum * take;
        const latestAttendanceIdsRaw = (
            await db.student.findMany({
                where: {
                    role: 'STUDENT',
                    isActive: true
                    // ... other conditions as needed
                },
                select: {
                    id: true,
                    schoolCheckInAttendance: {
                        take: 1,
                        orderBy: { date: 'desc' },
                        select: { id: true }
                    }
                }
            })
        ).map((student) => student.schoolCheckInAttendance[0]?.id);
        const latestAttendanceIds = latestAttendanceIdsRaw.filter((id) => id !== undefined);

        const activeStudents = await db.student.findMany({
            skip,
            take,
            orderBy: {
                akaalId: 'desc'
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
        return { activeStudents, count };
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
export async function selectActiveStudentsWithNoSubjects(search = '', page: number, termId: number, subjectOption = '', levelOption = '', sectionOption = '', attendanceOption = '') {
    const searchAsNumber = isNaN(Number(search)) ? undefined : parseInt(search);
    if (searchAsNumber) {
        const latestAttendanceIdsRaw = (
            await db.student.findMany({
                where: {
                    role: 'STUDENT',
                    isActive: true
                    // ... other conditions as needed
                },
                select: {
                    id: true,
                    schoolCheckInAttendance: {
                        take: 1,
                        orderBy: { date: 'desc' },
                        select: { id: true }
                    }
                }
            })
        ).map((student) => student.schoolCheckInAttendance[0]?.id);
        const latestAttendanceIds = latestAttendanceIdsRaw.filter((id) => id !== undefined);
        const activeStudents = await db.student.findMany({
            // orderBy: {
            //     attendancePercentageValue: 'desc'
            // },
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
        const latestAttendanceIdsRaw = (
            await db.student.findMany({
                where: {
                    role: 'STUDENT',
                    isActive: true
                    // ... other conditions as needed
                },
                select: {
                    id: true,
                    schoolCheckInAttendance: {
                        take: 1,
                        orderBy: { date: 'desc' },
                        select: { id: true }
                    }
                }
            })
        ).map((student) => student.schoolCheckInAttendance[0]?.id);
        const latestAttendanceIds = latestAttendanceIdsRaw.filter((id) => id !== undefined);

        const activeStudents = await db.student.findMany({
            // orderBy: {
            //     attendancePercentageValue: 'desc'
            // },
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
export async function findActiveStudentById(id: string) {
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

    return studentTermFees;
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
/*find fee details by id*/
export async function findFeePaymentById(id: string) {
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
export async function updateAmountPaidAtSchool(feePaymentId: string, paidAmount: string, paidDate: string, paymentMethod: string, paymentStatus: string, remarks: string, receivedBy: string) {
    return db.$transaction(async (transaction) => {
        const feePayment = await transaction.feePayment.findUnique({
            where: { id: +feePaymentId },
            include: { studentTermFee: { include: { student: true } } }
        });

        if (!feePayment) {
            throw customError('Fee payment record not found', 'fail', 400, true);
        }
        const newDueAmount = feePayment.dueAmount - parseInt(paidAmount);

        let updateStatus: PaymentStatus;
        let overDue = false;
        if (newDueAmount > 0 && new Date() > new Date(feePayment.dueDate)) {
            overDue = true;
            updateStatus = PaymentStatus.OVERDUE;
        } else {
            updateStatus = PaymentStatus.PENDING;
        }
        if (newDueAmount <= 0) {
            updateStatus = PaymentStatus.PAID; // Update status to PAID only if due amount is zero or less
        }
        // Validate client-provided paymentStatus
        if (paymentStatus === 'PAID' && newDueAmount > 0) {
            throw customError('Invalid payment status: "PAID" cannot be applied unless the due amount is zero.', 'fail', 400, true);
        }
        if (paymentStatus === 'PENDING' && newDueAmount === 0) {
            throw customError('Invalid payment status: "PENDING" cannot be applied if the due amount is zero.', 'fail', 400, true);
        }
        if (paymentStatus === 'OVERDUE') {
            if (newDueAmount <= 0 || new Date() <= new Date(feePayment.dueDate)) {
                throw customError('Invalid payment status: "OVERDUE" cannot be applied unless the due amount is more than zero and the current date is past the due date.', 'fail', 400, true);
            }
            updateStatus = PaymentStatus.OVERDUE; // Explicitly setting to OVERDUE as provided and validated
        }
        const paymentInstallment = await transaction.paymentInstallment.create({
            data: {
                feePaymentId: +feePaymentId,
                paidAmount: +paidAmount,
                paidDate: paidDate ? new Date(paidDate) : new Date(),
                paymentMethod: paymentMethod === 'CREDIT_CARD' ? PaymentMethod.CREDIT_CARD : paymentMethod === 'CASH' ? PaymentMethod.CASH : PaymentMethod.OTHER,
                paymentStatus: updateStatus,
                remarks,
                receivedBy
            }
        });
        await transaction.feePayment.update({
            where: { id: +feePaymentId },
            data: {
                dueAmount: newDueAmount > 0 ? newDueAmount : 0,
                hasOverDue: overDue,
                status: updateStatus
            }
        });

        const extraAmount = newDueAmount < 0 ? -newDueAmount : 0;
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
            newDueAmount,
            extraAmount
        };
    });
}
export async function updateAmountFeeDue(feePaymentId: string, newDueAmount: number, discountReason: string, status: string) {
    return db.$transaction(async (prisma) => {
        const feePayment = await prisma.feePayment.findUnique({
            where: { id: +feePaymentId }
        });

        if (!feePayment) throw customError('Fee payment record not found.', 'fail', 404, true);

        // Enforce the business rule: If status is 'PAID', newDueAmount must be zero, and vice versa
        if (status === 'PAID' && newDueAmount !== 0) {
            throw customError('When status is PAID, due amount must be zero.', 'fail', 400, true);
        }
        if (newDueAmount === 0 && status !== 'PAID') {
            throw customError('Due amount can only be zero if the status is PAID.', 'fail', 400, true);
        }
        if (newDueAmount === 0 && status === 'OVERDUE') {
            throw customError('Due amount cannot be zero if the status is OVERDUE.', 'fail', 400, true);
        }
        const originalFeeAmount = feePayment.feeAmount || 0; // Assume feeAmount holds the initial total fee before any discounts
        const newDiscountAmount = originalFeeAmount - newDueAmount;
        const oldDueAmount = feePayment.dueAmount;

        const updatedFeePayment = await prisma.feePayment.update({
            where: { id: feePayment.id },
            data: {
                dueAmount: newDueAmount,
                hasDiscount: newDiscountAmount > 0,
                discountAmount: newDiscountAmount,
                adjustedFeeAmount: newDueAmount,
                discountReason: discountReason,
                status: status === 'PAID' ? PaymentStatus.PAID : status === 'PENDING' ? PaymentStatus.PENDING : PaymentStatus.OVERDUE
            }
        });

        const paymentInstallment = await prisma.paymentInstallment.create({
            data: {
                feePaymentId: +feePaymentId,
                paidAmount: newDiscountAmount,
                paidDate: new Date(),
                paymentMethod: 'DISCOUNT',
                paymentStatus: status === 'PAID' ? PaymentStatus.PAID : status === 'PENDING' ? PaymentStatus.PENDING : PaymentStatus.OVERDUE,
                remarks: `${discountReason}`,
                receivedBy: 'ADMIN'
            }
        });

        return updatedFeePayment;
    });
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
        let updateStatus = feePayment.status as PaymentStatus;
        let overDue = feePayment.hasOverDue;
        let newDueAmount = feePayment.dueAmount - creditToApply;
        let remainingCredit = student.creditBalance - creditToApply;

        if (newDueAmount <= 0) {
            newDueAmount = 0;
            updateStatus = PaymentStatus.PAID;
            // console.log(updateStatus);
            overDue = false;
        }

        // Update FeePayment and Student records
        const updatedFeePayment = await prisma.feePayment.update({
            where: { id: +feePaymentId },
            data: {
                dueAmount: newDueAmount,
                status: updateStatus,
                hasOverDue: overDue
            }
        });

        await prisma.student.update({
            where: { id: student.id },
            data: { creditBalance: remainingCredit, hasOverDue: overDue }
        });
        const paymentInstallment = await prisma.paymentInstallment.create({
            data: {
                feePaymentId: +feePaymentId,
                paidAmount: creditToApply,
                paidDate: new Date(),
                paymentMethod: PaymentMethod.CREDIT_BALANCE,
                paymentStatus: updateStatus,
                remarks: remarks,
                receivedBy: 'ADMIN'
            }
        });

        return {
            message: 'Credit applied successfully.',
            feePayment: updatedFeePayment,
            remainingCredit
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
/*get invoice data for generating invoice*/

export async function fetchFeePaymentByIdForInvoice(feePaymentId: string) {
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

    return currentTerm;
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

    // Find or create StudentClassAsstudentClassAssignment Record
    const existingRecord = await db.studentClassAssignment.findFirst({
        where: {
            enrollmentId: subjectEnrollment.enrollment.id,
            termSubjectLevelId: termSubjectLevel.id,
            studentId: +studentId,
            sectionId: section.id
        }
    });
    // console.log(existingRecord);
    if (existingRecord) {
        // Update if already assigned
        await db.studentClassAssignment.update({
            where: {
                id: existingRecord.id
            },
            data: {
                isCurrentlyAssigned: true,
                sectionId: section.id // Update sectionId
            }
        });
    } else {
        // Create new assignment
        await db.studentClassAssignment.create({
            data: {
                enrollmentId: subjectEnrollment.enrollment.id,
                termSubjectLevelId: termSubjectLevel.id,
                studentId: +studentId,
                isCurrentlyAssigned: true,
                sectionId: section.id // Assign sectionId
            }
        });
    }
    await db.enrollment.update({
        where: {
            id: subjectEnrollment.enrollment.id
        },
        data: {
            termSubjectLevelId: termSubjectLevel.id
        }
    });

    return { message: 'Class assigned successfully' };
}

/****** * remove/ delete  class for  student*****/
export async function deleteClassAssignment(id: string) {
    // Check if the class assignment exists
    const classAssignment = await db.studentClassAssignment.findUnique({
        where: {
            id: +id
        }
    });

    if (!classAssignment) {
        throw new Error('Class assignment not found with the given ID.');
    }

    // Delete the class assignment
    await db.studentClassAssignment.delete({
        where: {
            id: +id
        }
    });

    return { message: 'Class assignment deleted successfully' };
}

/*get all classes for students*/
export async function findUniqueStudentClassDetails(studentId: string) {
    const studentClassAssignmentRecords = await db.studentClassAssignment.findMany({
        where: {
            studentId: +studentId,
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

        // Check for remaining enrollments in the same TermSubjectGroup
        const remainingEnrollments = await db.enrollment.count({
            where: {
                studentId: deEnrollData.activeStudentId,
                termSubjectGroupId: deEnrollItem.termSubjectGroupId
            }
        });

        // If no remaining enrollments, handle StudentTermFee and FeePayment records
        if (remainingEnrollments === 0) {
            const studentTermFee = await db.studentTermFee.findFirst({
                where: {
                    studentId: deEnrollData.activeStudentId,
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
            // Update the schoolCheckInAttendance record to mark isOnLeave as true
            await db.schoolCheckInAttendance.update({
                where: {
                    id: schoolAttendanceRecord.id
                },
                data: {
                    isOnLeave: true
                }
            });
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

// services/studentService.js
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
export async function findStudentAttendanceById(studentId: string) {
    const currentTerm = await db.term.findFirst({
        where: {
            currentTerm: true
        }
    });

    // if (!currentTerm) return [];
    const attendance = await db.schoolCheckInAttendance.findMany({
        where: {
            student: {
                id: +studentId
            },
            date: {
                gte: currentTerm?.startDate
            }
        },

        include: {
            student: {
                include: {
                    personalDetails: true
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

// edit change attendance at the attendance tab in activestudent detail page

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

    // Update the attendance value of the updated record
    const finalAttendanceUpdate = await db.schoolCheckInAttendance.update({
        where: {
            id: updatedAttendanceRecord.id
        },
        data: {
            attendanceValue: newAttendanceValue
        }
    });

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

    // Mark as not checked in and update the marked status
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
