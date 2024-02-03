import cron from 'node-cron';
import { consolidateStudentDataForEmail } from '../service/cron.service/cron.consolidatedEmail.service/cron.consolidatedEmail.service';

// Schedule to run every Sunday at 4:30 PM
cron.schedule('30 16 * * 0', async () => {
    // console.log('Running cron job: Send Feedback Emails');
    await consolidateStudentDataForEmail();
});
// // Schedule to run every Sunday at 4:30 PM
// cron.schedule('* * * * *', async () => {
//     console.log('Running cron job: Send Feedback Emails');
//     await sendAutomatedEmails();
// });
