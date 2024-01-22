import cron from 'node-cron';
import { sendFeedbackEmails } from '../service/cron.service/cron.service';

// Schedule to run every Sunday at 4:30 PM
cron.schedule('30 16 * * 0', async () => {
    console.log('Running cron job: Send Feedback Emails');
    await sendFeedbackEmails();
});
// // Schedule to run every Sunday at 4:30 PM
// cron.schedule('* * * * *', async () => {
//     console.log('Running cron job: Send Feedback Emails');
//     await sendFeedbackEmails();
// });
