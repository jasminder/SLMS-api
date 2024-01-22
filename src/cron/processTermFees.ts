import cron from 'node-cron';
import { processTermFees } from '../service/cron.service/cron.service';

cron.schedule('0 10 * */2 0#2', async () => {
    console.log('Processing term fees for students at 10 AM on the second Sunday of every second month');
    await processTermFees();
});
