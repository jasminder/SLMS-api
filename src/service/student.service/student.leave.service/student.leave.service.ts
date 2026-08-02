import { customError } from '../../../utils/customError';
import { db } from '../../../utils/db.server';
import { syncLeaveAttendance } from '../../../utils/syncLeaveAttendance';

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
    // The row above is created APPROVED unconditionally — this path has no approval step.
    // The old guard here read `status === 'APPROVED'` off the *parameter*, and every client
    // (Flutter `leave_repository.dart`, web `StudentLeave.tsx`) posts 'PENDING', so the
    // guard never matched and attendance was never corrected. Sync off the row we wrote.
    await syncLeaveAttendance(+studentId, formattedStartDate, formattedEndDate, leaveApplication.status === 'APPROVED');

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
