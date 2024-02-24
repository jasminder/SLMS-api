import { customError } from '../../../utils/customError';
import { db } from '../../../utils/db.server';

/* create student skip report*/
export async function createSkipReport(studentId: string, adminId: string, reason: string, className = 'NA') {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    if (!reason) {
        throw customError('Reason is required to create a skip report.', 'fail', 400, true);
    }

    const skipReport = await db.skipReport.create({
        data: {
            studentId: +studentId,
            adminId: +adminId,
            date: new Date(),
            reason,
            className
        }
    });
    return skipReport;
}
export async function getSkipReports(studentId: string) {
    const skipReports = await db.skipReport.findMany({
        where: {
            studentId: +studentId
        },

        include: {
            student: {
                include: {
                    personalDetails: true
                }
            }, // Include student details
            teacher: {
                include: {
                    teacherPersonalDetails: true
                }
            },
            admin: {
                include: {
                    adminPersonalDetails: true
                }
            }

            // Include teacher details
        },
        orderBy: {
            updatedAt: 'desc'
        }
    });
    return skipReports;
}

export async function updateSkipReportReason(skipReportId: string, reason: string) {
    const existingReport = await db.skipReport.findUnique({
        where: {
            id: +skipReportId
        }
    });

    if (!existingReport) {
        throw customError('Flag not found.', 'fail', 404, true);
    }

    if (existingReport.isClosed) {
        throw customError('The Flag is already closed.', 'fail', 400, true);
    }
    const updatedReport = await db.skipReport.updateMany({
        where: {
            id: +skipReportId,
            isClosed: false // Assuming isOpen is a field to check if the flag is still open
        },
        data: {
            reason
        }
    });
    return updatedReport;
}

export async function closeSkipReport(skipReportId: string, reason: string, adminClosingRemarks: string) {
    if (!reason.trim()) {
        throw customError('Reason is required to close the skip report.', 'fail', 400, true);
    }

    if (!adminClosingRemarks.trim()) {
        throw customError('Admin closing remarks are required to close the skip report.', 'fail', 400, true);
    }
    const updatedReport = await db.skipReport.update({
        where: {
            id: +skipReportId,
            isClosed: false
        },
        data: {
            reason,
            adminClosingRemarks,
            isClosed: true,
            closeDate: new Date()
        }
    });
    return updatedReport;
}
export async function findAllSkipReports(status: string) {
    let whereCondition = {};

    if (status === 'open') {
        whereCondition = { isClosed: false };
    } else if (status === 'closed') {
        whereCondition = { isClosed: true };
    } else {
        whereCondition = {};
    }
    const skipReports = await db.skipReport.findMany({
        where: whereCondition,
        include: {
            student: {
                include: {
                    personalDetails: true
                }
            }, // Include student details
            teacher: {
                include: {
                    teacherPersonalDetails: true
                }
            },
            admin: {
                include: {
                    adminPersonalDetails: true
                }
            }
            // Include teacher details
        }
    });
    return skipReports;
}
