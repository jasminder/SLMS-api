import { db } from '../utils/db.server';
import { createSchoolCheckInAttendanceForStudent } from '../service/admin.service/admin.checkin.service/admin.checkin.service';
const cron = require('node-cron');

// Schedule to run every Sunday at 7:30 AM
cron.schedule('30 7 * * 0', async () => {
    console.log('Running cron job: Create Automated School Check In Attendance');
    await createAutomatedSchoolCheckInAttendance();
});

export async function createAutomatedSchoolCheckInAttendance() {
    console.log('createAutomatedSchoolCheckInAttendance');
    try {
        // Check if automation is enabled for current term
        const currentTerm = await db.term.findFirst({
            where: {
                currentTerm: true
            }
        });

        if (!currentTerm?.automatedAttendanceEnabled) {
            console.log('Automated attendance creation is disabled for current term');
            return;
        }
        console.log('Automated attendance creation is enabled for current term');
        console.log(currentTerm);
        // Get today's date
        const today = new Date().toISOString().split('T')[0];

        // Call your existing function
        return await createSchoolCheckInAttendanceForStudent(today);
    } catch (error) {
        console.error('Error in automated attendance creation:', error);
        // Handle error appropriately
    }
}
