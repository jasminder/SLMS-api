import { customError } from '../../../utils/customError';
import { db } from '../../../utils/db.server';

export async function createLeaveApplicationByStudent(
    studentId: string,
    appliedById: string,
    appliedByRole: string,
    startDate: string,
    endDate: string,
    reason: string,
    status: string,
    comments: string
) {
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
            status: 'APPROVED'
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

    return leaveApplication;
}

export async function fetchLeavesForStudentPortal(studentId: number) {
    const leaveApplications = await db.leave.findMany({
        where: { studentId: studentId },
        orderBy:{
            createdAt:"desc"
        }
    });

    return leaveApplications;
}
