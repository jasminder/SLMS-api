import { runWeeklyAbsenceFlagging } from '../service/attendance.watchlist.service/attendance.watchlist.service';
const cron = require('node-cron');

// Absence list (Scope of Work item 24): flag the students on four absences in a row or below 60% attendance for the term.
// Runs once a week, FRIDAY 06:00 school time, so the list is fresh on Friday as the school asked. It counts every class day
// up to then, including the previous Sunday (the main school day). A student with an open flag is never flagged twice.
// Set ABSENCE_WATCHLIST_DISABLED=true to switch it off.
const SCHEDULES = [{ cron: '0 6 * * 5', label: 'Friday morning' }];

for (const schedule of SCHEDULES) {
    cron.schedule(
        schedule.cron,
        async () => {
            if (process.env.ABSENCE_WATCHLIST_DISABLED === 'true') return;
            try {
                const result = await runWeeklyAbsenceFlagging();
                console.log(`Absence list (${schedule.label}): flagged`, result.created, 'new students,', result.alreadyFlagged, 'already flagged,', result.checked, 'checked');
            } catch (error) {
                console.error(`Absence list (${schedule.label}) failed:`, error);
            }
        },
        { timezone: 'Australia/Sydney' }
    );
}
