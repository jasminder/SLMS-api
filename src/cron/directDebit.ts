import { runDirectDebitJob } from '../service/directDebit.service/directDebit.service';
import { claimReminderRun, claimScheduledRun } from '../service/directDebit.service/directDebitSettings.service';
const cron = require('node-cron');

// BECS Direct Debit. Checks every minute; the on/off switch, run time and frequency (daily / weekdays / weekly /
// monthly / quarterly) come from Administration > Direct Debit, so changes apply without a restart.
// - Debit run: once on each run day, at or after the run time (school time: the server runs on Australia/Sydney).
// - Reminder emails: once every day at the run time, for debits coming up within the reminder window.
// DIRECT_DEBIT_DISABLED=true in the env stops both regardless of the settings.
cron.schedule('* * * * *', async () => {
    if (process.env.DIRECT_DEBIT_DISABLED === 'true') return;
    let debits = false;
    let reminders = false;
    try {
        debits = await claimScheduledRun();
        reminders = await claimReminderRun();
    } catch (error) {
        console.error('[direct-debit] schedule check failed:', error);
        return;
    }
    if (debits || reminders) await runDirectDebitJob('schedule', { debits, reminders });
});
