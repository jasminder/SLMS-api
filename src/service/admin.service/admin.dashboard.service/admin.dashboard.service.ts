import { db } from '../../../utils/db.server';
import { SchoolDay } from '@prisma/client';

export async function fetchActiveCheckedInStudents(dateString: string) {
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
    const activeStudents = await db.student.findMany({
        where: {
            isActive: true,
            role: 'STUDENT',
            studentTermFee: {
                some: {
                    termId: currentTerm?.id
                }
            }
        }
    });
    const recentSchoolDay = await db.schoolDay.findFirst({
        where: {
            schoolOperatedDate: {
                lte: startDate // Less than or equal to the query date
            }
        },
        orderBy: {
            schoolOperatedDate: 'desc'
        }
    });

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
    console.log(previousSchoolDay, 'previousSchoolDay');
    // Function to fetch attendance for a given school day
    const fetchAttendance = async (schoolDay: SchoolDay | null) => {
        if (!schoolDay) return { totalCheckedIn: [], totalCheckedOut: [], totalAbsent: [], totalLeave: [],totalPresent:[] };

        const startDate = new Date(schoolDay.schoolOperatedDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(schoolDay.schoolOperatedDate);
        endDate.setHours(23, 59, 59, 999);

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
        const totalLeave = await db.classAttendance.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                },
                attendanceStatus: 'LEAVE'
            },
            include: {
                studentClassAssignment: {
                    include: {
                        student: true
                    }
                }
            }
        });

        return { totalCheckedIn, totalCheckedOut, totalAbsent, totalLeave ,totalPresent};
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
    const date = new Date(dateString);
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const studentsOnLeave = await db.classAttendance.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            },
            attendanceStatus: 'LEAVE' // Replace 'ON_LEAVE' with the actual enum value for leave
        },
        include: {
            schoolCheckInAttendance: {
                include: {
                    student: true
                }
            }
        }
    });

    return studentsOnLeave.map((attendanceRecord) => attendanceRecord.schoolCheckInAttendance.student);
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
