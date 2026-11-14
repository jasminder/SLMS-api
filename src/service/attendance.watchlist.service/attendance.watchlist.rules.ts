/**
 * Weekly absence list rules (Scope of Work item 24). Pure and import-free so it can be unit-tested without a database.
 *
 * A student is on the list when EITHER:
 *   1. four absences in a row: the last four days they were expected, ignoring days on leave, were all missed; or
 *   2. attendance below 60% for the whole current term so far.
 *
 * The percentage is deliberately the SAME number the student list and the student profile already show: checked-in days
 * divided by all attendance rows since the term start, where a day on leave counts as a day not attended (see
 * cron/calculateTermAttendance.ts and the profile's Attendance tab). That keeps the list and the other screens in agreement.
 * Days on leave are NOT absences for the "four in a row" rule: a leave day is skipped, it neither adds to nor breaks the run.
 *
 * A student who was cleared is not flagged again until they have a NEW absence after the clear.
 */
export const ABSENCES_IN_A_ROW = 4;
export const PERCENT_BELOW = 60;
/** Fewer recorded days than this is too little to judge a percentage on. */
export const MIN_DAYS_FOR_PERCENT = 4;
export const WATCHLIST_CLASS_NAME = 'Weekly absence list';

export type AttendanceDay = { date: Date | string; checkedIn: boolean; isOnLeave: boolean };

export type WatchlistResult = {
    isCandidate: boolean;
    /** consecutive missed days, most recent first, leave days skipped */
    absencesInARow: number;
    /** whole term so far, one decimal; null when the student has no recorded days */
    termPercent: number | null;
    daysInTerm: number;
    lastAttendedOn: Date | null;
    reasons: string[];
};

const toTime = (value: Date | string) => new Date(value).getTime();
const isAbsence = (day: AttendanceDay) => !day.checkedIn && !day.isOnLeave;

export function evaluateStudent(days: readonly AttendanceDay[], termStart: Date, asOf: Date, lastClearedAt: Date | null = null): WatchlistResult {
    const termDays = days.filter((d) => toTime(d.date) >= termStart.getTime() && toTime(d.date) <= asOf.getTime()).sort((a, b) => toTime(b.date) - toTime(a.date));

    let absencesInARow = 0;
    for (const day of termDays) {
        if (day.isOnLeave) continue;
        if (day.checkedIn) break;
        absencesInARow++;
    }

    const daysInTerm = termDays.length;
    const attended = termDays.filter((d) => d.checkedIn).length;
    const rawPercent = daysInTerm > 0 ? (attended * 100) / daysInTerm : null;
    const lastAttended = termDays.find((d) => d.checkedIn);

    const fourInARow = absencesInARow >= ABSENCES_IN_A_ROW;
    const belowPercent = rawPercent !== null && daysInTerm >= MIN_DAYS_FOR_PERCENT && rawPercent < PERCENT_BELOW;
    const newAbsenceSinceClear = lastClearedAt === null || termDays.some((d) => isAbsence(d) && toTime(d.date) > lastClearedAt.getTime());

    const reasons: string[] = [];
    if (fourInARow) reasons.push(`${absencesInARow} absences in a row`);
    if (belowPercent && rawPercent !== null) reasons.push(`Attendance ${Math.floor(rawPercent)}% for the term so far, below ${PERCENT_BELOW}%`);

    return {
        isCandidate: (fourInARow || belowPercent) && newAbsenceSinceClear,
        absencesInARow,
        termPercent: rawPercent === null ? null : Math.round(rawPercent * 10) / 10,
        daysInTerm,
        lastAttendedOn: lastAttended ? new Date(lastAttended.date) : null,
        reasons
    };
}
