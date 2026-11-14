import { runWeeklyAbsenceFlagging } from '../service/attendance.watchlist.service/attendance.watchlist.service';
const cron = require('node-cron');

// Weekly absence list (Scope of Work item 24): every Saturday at 21:00 school time, after the Saturday classes have finished,
// flag the students on four absences in a row or below 60% attendance for the term. Set ABSENCE_WATCHLIST_DISABLED=true to switch it off.
cron.schedule(
    '0 21 * * 6',
    async () => {
        if (process.env.ABSENCE_WATCHLIST_DISABLED === 'true') return;
        try {
            const result = await runWeeklyAbsenceFlagging();
            console.log('Weekly absence list: flagged', result.created, 'new students,', result.alreadyFlagged, 'already flagged,', result.checked, 'checked');
        } catch (error) {
            console.error('Weekly absence list failed:', error);
        }
    },
    { timezone: 'Australia/Sydney' }
);
