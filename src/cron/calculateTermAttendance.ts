import { Student } from '@prisma/client';
import { db } from '../utils/db.server';

const cron = require('node-cron');

// Schedule the task to run at the end of each term or another suitable interval
// cron.schedule('* * * * *', () => {
//     // Adjust cron pattern to fit the term schedule
//     console.log('Running scheduled task to update term attendance counts');
//     calculateTermAttendance();
// });
cron.schedule('0 17 * * *', () => {
    // Adjust cron pattern to fit the term schedule
    console.log('Running scheduled task to update term attendance counts');
    calculateTermAttendance();
});

async function calculateTermAttendance() {
    try {
        const students = await db.student.findMany({
            include: {
                schoolCheckInAttendance: {
                    // Optionally filter by specific terms if applicable
                    // where: { term: {id: specificTermId} }
                }
            }
        });

        await Promise.all(
            students.map(async (student) => {
                if (student.schoolCheckInAttendance) {
                    const totalRecords = student.schoolCheckInAttendance.length;
                    const totalCheckedIn = student.schoolCheckInAttendance.filter((attendance) => attendance.checkedIn).length;

                    if (totalRecords > 0) {
                        const termAttendance = ((totalCheckedIn / totalRecords) * 100).toFixed(4);

                        const recentAttendanceRecords = await db.schoolCheckInAttendance.findMany({
                            where: { studentId: student.id },
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

                        await db.student.update({
                            where: { id: student.id },
                            data: { termAttendance: parseFloat(termAttendance), attendancePercentageValue: newAttendanceValue }
                        });
                    }
                }
            })
        );

        console.log('Term attendance percentages updated successfully.');
    } catch (error) {
        console.error('Error updating term attendance percentages:', error);
    } finally {
        await db.$disconnect();
    }
}

// Call the function or set it to be called by a scheduler
