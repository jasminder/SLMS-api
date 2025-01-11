import { db } from '../utils/db.server';
import { createSchoolCheckInAttendanceForStudent } from '../service/admin.service/admin.checkin.service/admin.checkin.service';
const cron = require('node-cron');

// Schedule to run every Sunday at 7:30 AM
cron.schedule('30 7 * * 0', async () => {
    console.log('Running cron job: Create Automated School Check In Attendance');
    await createAutomatedSchoolCheckInAttendance();
});

export async function createAutomatedSchoolCheckInAttendance() {
    try {
        // Check if automation is enabled for current term
        const currentTerm = await db.term.findFirst({
            where: {
                currentTerm: true
            }
        });

        if (!currentTerm?.automatedAttendanceEnabled) {
            return;
        }

        // Get today's date
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Check if today is after or equal to term start date
        if (today < currentTerm.startDate) {
            console.log('Skipping attendance creation: Current date is before term start date');
            return;
        }

        // Call your existing function
        return await createSchoolCheckInAttendanceForStudent(todayStr);
    } catch (error) {
        console.error('Error in automated attendance creation:', error);
        // Handle error appropriately
    }
}
