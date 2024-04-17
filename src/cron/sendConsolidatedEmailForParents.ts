import cron from 'node-cron';
import { consolidateStudentDataForEmail } from '../service/cron.service/cron.consolidatedEmail.service/cron.consolidatedEmail.service';

// Schedule to run every Sunday at 4:30 PM
// cron.schedule('30 16 * * 0', async () => {
//     try {
//         // Attempt to run the consolidation function
//         await consolidateStudentDataForEmail();
//         console.log('Cron job executed successfully: consolidateStudentDataForEmail');
//     } catch (error) {
//         // Log any errors that occur
//         console.error('Error occurred in cron job: consolidateStudentDataForEmail', error);
//     }
// });
// Schedule to run every Sunday at 4:30 PM
// cron.schedule('* * * * *', async () => {
//     console.log('Running cron job: Send Feedback Emails');
//     await consolidateStudentDataForEmail();
// });
cron.schedule('30 20 * * 0-5', async () => {
    try {
        // Attempt to run the consolidation function
        if (process.env.NODE_ENV == 'production') {
            await consolidateStudentDataForEmail();
            console.log('Cron job executed successfully: consolidateStudentDataForEmail');
        }
    } catch (error) {
        // Log any errors that occur
        console.error('Error occurred in cron job: consolidateStudentDataForEmail', error);
    }
});
