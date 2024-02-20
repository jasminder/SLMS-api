import cron from 'node-cron';
import { processMonthlyFees } from '../service/cron.service/cron.service';

// cron.schedule('* * * * *', async () => {
//     console.log('Running test of the monthly fees processing');
//     await processMonthlyFees();
// });

// Run every Sunday at midnight
// Schedule to run at 11:00 AM on the second Sunday of every month
// cron.schedule('0 11 * * 0#2', async () => {
//     // console.log('Processing monthly fees for students at 11 AM on the second Sunday');
//     await processMonthlyFees();
// });
