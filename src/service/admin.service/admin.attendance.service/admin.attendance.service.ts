import { customError } from '../../../utils/customError';
import { db } from '../../../utils/db.server';

/*get skip report if the the student has skipped a class */
export async function findSkipReportsForToday() {
    const currentDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const skipReports = await db.skipReport.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            },
            isClosed: false
        },
        include: {
            student: true, // Include student details
            teacher: true
            // Include teacher details
        }
    });
    return skipReports;
}

/*close skip report if the the student has skipped a class */
export async function closeSkipReportToday(skipReportId: string, closingRemark: string) {
    if (!closingRemark) {
        throw customError('Closing remark is required to close report.', 'fail', 404, true);
    }
    const updatedSkipReport = await db.skipReport.update({
        where: {
            id: +skipReportId
        },
        data: {
            isClosed: true, // Set the 'isClosed' field to true
            adminClosingRemarks: closingRemark // Set the closing remark
        }
    });

    return updatedSkipReport;
}
