import { db } from '../utils/db.server';
const cron = require('node-cron');
import { checkAndMarkOverduePayments } from '../service/cron.service/cron.checkAndMarkOverduePayments/cron.checkAndMarkOverduePayments';

// Schedule a task to run every day at 6:00 PM
cron.schedule('0 18 * * *', () => {
    console.log('Running the check for overdue payments...');
    checkAndMarkOverduePayments()
        .then(() => console.log('Check completed successfully.'))
        .catch((error) => console.error('Error during overdue payments check:', error));
});
