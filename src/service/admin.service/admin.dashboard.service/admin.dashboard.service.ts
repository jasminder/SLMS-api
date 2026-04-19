import { db } from '../../../utils/db.server';
import { Day, SchoolDay } from '@prisma/client';
import { getCurrentDay } from '../../../utils/getCurrentDay';
import moment from 'moment-timezone';

const TIMEZONE = process.env.TIMEZONE || 'Australia/Sydney';

export async function fetchActiveCheckedInStudents(dateString: string) {
    // Always compute date boundaries in Australian timezone regardless of server TZ
    const aestDate = moment.tz(dateString, TIMEZONE);
    const startDate = aestDate.clone().startOf('day').toDate();
    const endDate = aestDate.clone().endOf('day').toDate();
    const currentTerm = await db.term.findFirst({
        where: {
            currentTerm: true
        },
        select: {
            id: true
        }
    });
    const currentDay = getCurrentDay();
    const currentTimetable = await db.timetable.findFirst({
        where: {
            isActive: true,
            day: currentDay as Day
        },
        include: {
            timetableSlots: true
        }
    });
    const slotMappings = currentTimetable?.timetableSlots
        .filter((slot) => slot.termSubjectLevelId !== null && slot.sectionId !== null)
        .map((slot) => ({
            termSubjectLevelId: slot.termSubjectLevelId!,
            sectionId: slot.sectionId!
        }));

    // Add safety check before query
    if (!slotMappings || slotMappings.length === 0) {
        return {
            activeStudents: [],
            recentAttendance: { totalCheckedIn: [], totalCheckedOut: [], totalAbsent: [], totalLeave: [], totalPresent: [] },
            previousAttendance: { totalCheckedIn: [], totalCheckedOut: [], totalAbsent: [], totalLeave: [], totalPresent: [] }
        };
    }

    const activeStudents = await db.student.findMany({
        where: {
            isActive: true,
            studentClassAssignment: {
                some: {
                    OR: slotMappings.map((slot) => ({
                        AND: {
                            termSubjectLevelId: slot.termSubjectLevelId,
                            sectionId: slot.sectionId,
                            isCurrentlyAssigned: true
                        }
                    }))
                }
            },
            studentTermFee: {
                some: {
                    termId: currentTerm?.id
                }
            }
        },
        include: {
            personalDetails: true,
            studentClassAssignment: {
                where: {
                    isCurrentlyAssigned: true
                },
                include: {
                    termSubjectLevel: {
                        include: {
                            subject: true,
                            level: true
                        }
                    },
                    section: true
                }
            }
        }
    });

    const recentSchoolDay = await db.schoolDay.findFirst({
        where: {
            schoolOperatedDate: {
                lte: endDate // Use end of AEST day so today's school day is included
            }
        },
        orderBy: {
            schoolOperatedDate: 'desc'
        }
    });

    // here

    // if (!recentSchoolDay) {
    //     throw new Error('No recent school day found.');
    // }

    // Find the immediate previous SchoolDay
    const previousSchoolDay = await db.schoolDay.findFirst({
        where: {
            schoolOperatedDate: {
                lt: recentSchoolDay?.schoolOperatedDate
            }
        },
        orderBy: {
            schoolOperatedDate: 'desc'
        }
    });

    // Function to fetch attendance for a given school day
    const fetchAttendance = async (schoolDay: SchoolDay | null) => {
        if (!schoolDay) return { totalCheckedIn: [], totalCheckedOut: [], totalAbsent: [], totalLeave: [], totalPresent: [] };

        const startDate = moment.tz(schoolDay.schoolOperatedDate, TIMEZONE).startOf('day').toDate();
        const endDate = moment.tz(schoolDay.schoolOperatedDate, TIMEZONE).endOf('day').toDate();

        const totalCheckedIn = await db.schoolCheckInAttendance.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                },
                isMarked: true,
                checkedIn: true
            },
            include: {
                student: true
            }
        });
        const totalCheckedOut = await db.schoolCheckInAttendance.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                },
                isMarked: true,
                isCheckedOut: true
            },
            include: {
                student: true
            }
        });

        const totalAbsent = await db.classAttendance.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                },
                attendanceStatus: 'ABSENT'
            },
            include: {
                studentClassAssignment: {
                    include: {
                        student: true
                    }
                }
            }
        });
        const totalPresent = await db.classAttendance.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                },
                attendanceStatus: 'PRESENT'
            },
            include: {
                studentClassAssignment: {
                    include: {
                        student: true
                    }
                }
            }
        });
        const totalLeave = await db.schoolCheckInAttendance.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                },
                isOnLeave: true
            },
            include: {
                student: true
            }
        });

        return { totalCheckedIn, totalCheckedOut, totalAbsent, totalLeave, totalPresent };
    };

    // Fetch attendance for the most recent school day and the previous school day
    // if (previousSchoolDay && recentSchoolDay) {
    const recentAttendance = await fetchAttendance(recentSchoolDay);
    const previousAttendance = await fetchAttendance(previousSchoolDay);
    return {
        activeStudents,
        recentAttendance,
        previousAttendance
    };
    // }
}
export async function fetchCheckedOutStudents(dateString: string) {
    const date = new Date(dateString);
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const checkedOutStudents = await db.schoolCheckInAttendance.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            },
            isCheckedOut: true,
            isMarked: true
        },
        include: {
            student: true
        }
    });

    return checkedOutStudents;
}
export async function fetchStudentsOnLeave(dateString: string) {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const studentsOnLeave = await db.leave.findMany({
        where: {
            AND: [
                {
                    startDate: {
                        gte: currentDate // End date should be greater than or equal to current date
                    }
                },
                {
                    status: 'APPROVED' // Only get approved leaves
                }
            ]
        },
        orderBy: {
            startDate: 'asc' // Order by start date ascending
        },
        include: {
            student: true
        }
    });
    return studentsOnLeave.map((leave) => leave.student);
}
export async function fetchStudentsOnAbsent(dateString: string) {
    const date = new Date(dateString);
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const absentAttendanceRecords = await db.classAttendance.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            },
            attendanceStatus: 'ABSENT' // Replace 'ON_LEAVE' with the actual enum value for leave
        },
        include: {
            schoolCheckInAttendance: {
                include: {
                    student: true
                }
            }
        }
    });
    const absentStudentsWithoutCheckIn = absentAttendanceRecords
        .filter((record) => record.schoolCheckInAttendance && record.schoolCheckInAttendance.checkInTime === null)
        .map((record) => record.schoolCheckInAttendance.student);
    return absentStudentsWithoutCheckIn;
}
export async function fetchStudentsOnAttendance(dateString: string) {
    const date = new Date(dateString);
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const attendanceRecords = await db.classAttendance.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            },
            attendanceStatus: 'PRESENT' // Replace 'ON_LEAVE' with the actual enum value for leave
        },
        include: {
            schoolCheckInAttendance: {
                include: {
                    student: true
                }
            }
        }
    });

    return attendanceRecords;
}
export async function findActiveStudentsWithFlags(page: number, termId: number) {
    const take = 500;
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
            },
            skipReport: {
                some: {
                    isClosed: false
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
            akaalId: true,
            role: true,
            attendancePercentageValue: true,
            termAttendance: true,
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
                take: 2
            }
        }
    });

    const count = await db.student.count({
        where: {
            role: 'STUDENT',
            isActive: true,
            studentTermFee: {
                some: {
                    termId: termId
                }
            },
            skipReport: {
                some: {
                    isClosed: false
                }
            }
        }
    });

    return { activeStudents, count };
}
export async function searchActiveStudentsWithFlags(search = '', page: number, termId: number, subjectOption = '', levelOption = '', sectionOption = '') {
    const take = 500;
    const searchAsNumber = isNaN(Number(search)) ? undefined : parseInt(search);
    if (searchAsNumber) {
        const pageNum: number = page ?? 0;
        const skip = pageNum * take;
        const activeStudents = await db.student.findMany({
            skip,
            take,
            orderBy: {
                createdAt: 'desc'
            },
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    some: {
                        termId: termId
                    }
                },
                skipReport: {
                    some: {
                        isClosed: false
                    }
                },
                enrollments: {
                    some: {
                        termSubjectLevel: {
                            ...(subjectOption && { subjectId: +subjectOption }),
                            ...(levelOption && { levelId: +levelOption })
                            // ...(termId && { termId: termId })
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
                attendancePercentageValue: true,
                termAttendance: true,
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
                    take: 2
                }
            }
        });
        const count = await db.student.count({
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    some: {
                        termId: termId
                    }
                },
                skipReport: {
                    some: {
                        isClosed: false
                    }
                },
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
    } else if (!searchAsNumber) {
        const pageNum: number = page ?? 0;
        const skip = pageNum * take;
        const activeStudents = await db.student.findMany({
            skip,
            take,
            orderBy: {
                createdAt: 'desc'
            },
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    some: {
                        termId: termId
                    }
                },
                skipReport: {
                    some: {
                        isClosed: false
                    }
                },
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
                attendancePercentageValue: true,
                termAttendance: true,
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
                    take: 2
                }
            }
        });
        const count = await db.student.count({
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    some: {
                        termId: termId
                    }
                },
                skipReport: {
                    some: {
                        isClosed: false
                    }
                },
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
/****************************/
export async function fetchWeekdayActiveCheckedInStudents(dateString: string) {
    const date = new Date(dateString);
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    const currentTerm = await db.term.findFirst({
        where: {
            currentTerm: true
        },
        select: {
            id: true
        }
    });
    const activeStudents = await db.student.count({
        where: {
            isActive: true,
            role: 'STUDENT',
            studentTermFee: {
                some: {
                    termId: currentTerm?.id
                }
            },
            enrollments: {
                some: {
                    subjectEnrollment: {
                        termSubject: {
                            isOnWeekday: true
                        }
                    }
                }
            }
        }
    });
    const lastFiveSchoolDay = await db.schoolDay.findMany({
        where: {
            schoolOperatedDate: {
                lte: startDate // Less than or equal to the query date
            },
            // isOnSunday: false,
            isOnWeekday: true
        },
        include: {
            schoolAttendances: {
                where: {
                    classAttendance: {
                        some: {
                            studentClassAssignment: {
                                termSubjectLevel: {
                                    subject: { termSubject: { every: { isOnWeekday: true } } }
                                }
                            }
                        }
                    }
                }
            }
        },
        take: 5,
        orderBy: {
            schoolOperatedDate: 'desc'
        }
    });
    return { activeStudents, lastFiveSchoolDay };
}
export async function fetchKirtanAttendanceStudents(dateString: string) {
    const date = new Date(dateString);
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    const currentTerm = await db.term.findFirst({
        where: {
            currentTerm: true
        },
        select: {
            id: true,
            startDate: true
        }
    });
    const activeStudents = await db.student.count({
        where: {
            isActive: true,
            role: 'STUDENT',
            studentTermFee: {
                some: {
                    termId: currentTerm?.id
                }
            },
            studentClassAssignment: {
                some: {
                    termSubjectLevel: {
                        subject: {
                            name: 'Kirtan'
                        }
                    }
                }
            }
        }
    });
    const lastFiveSchoolDay = await db.schoolDay.findMany({
        where: {
            schoolOperatedDate: {
                lte: startDate,
                gte: currentTerm?.startDate
            }
        },
        include: {
            schoolAttendances: {
                where: {
                    classAttendance: {
                        some: {
                            studentClassAssignment: {
                                termSubjectLevel: {
                                    subject: { name: 'Kirtan' }
                                }
                            }
                        }
                    }
                }
            }
        },
        take: 5,
        orderBy: {
            schoolOperatedDate: 'desc'
        }
    });
    return { activeStudents, lastFiveSchoolDay };
}

export async function fetchPendingLeaves() {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    return await db.leave.findMany({
        where: {
            AND: [
                {
                    startDate: {
                        gte: currentDate // End date should be greater than or equal to current date
                    }
                },
                {
                    status: 'APPROVED' // Only get approved leaves
                }
            ]
        },
        take: 10,
        orderBy: {
            createdAt: 'desc'
        },
        include: {
            student: {
                include: {
                    personalDetails: true
                }
            }
        }
    });
}
export async function fetchUnviewedApplicants() {
    return await db.student.findMany({
        where: {
            role: 'APPLICANT',
            isActive: false,
            hasSeenNewApplication: false
        },
        include: {
            personalDetails: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}
