import { customError } from '../../../utils/customError';
import { db } from '../../../utils/db.server';

/*get skip report if the the student has skipped a class */
export async function findSkipReportsForToday() {
    const currentDate = new Date().toISOString().split('T')[0];
    const skipReports = await db.skipReport.findMany({
        where: {
            date: {
                equals: currentDate // Convert date to "YYYY-MM-DD" format and compare
            }
        },
        include: {
            student: true, // Include student details
            teacher: true // Include teacher details
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
