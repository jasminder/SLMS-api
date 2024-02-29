import { db } from '../../../utils/db.server';

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

    const checkedInStudents = await db.schoolCheckInAttendance.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            },
            checkedIn: true
        },
        include: {
            student: true
        }
    });

    return {
        activeStudents,
        checkedInStudents
    };
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
