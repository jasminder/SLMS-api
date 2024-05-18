import { getIo } from '../../../sockets/socket';
import { customError } from '../../../utils/customError';
import { db } from '../../../utils/db.server';


/* create student skip report*/
export async function createSkipReportByStudent(studentId: string,  reason: string, ) {
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
            date: new Date(),
            reason,
            className:"--"
        }
    });
    const io = getIo();
    io.emit('newSkipReport', { reportDetails: skipReport });

    return skipReport;
}

export async function getSkipReportsByStudent(studentId: string) {
    const skipReports = await db.skipReport.findMany({
        where: {
            studentId: +studentId,
            teacherId:null,
            adminId:null
        },

        include: {
            student: {
                include: {
                    personalDetails: true
                }
            }, // Include student details
       

            // Include teacher details
        },
        orderBy: {
            updatedAt: 'desc'
        }
    });
    return skipReports;
}