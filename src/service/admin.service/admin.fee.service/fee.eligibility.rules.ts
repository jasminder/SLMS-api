/**
 * Pure (database-free) rules that decide whether a student may be billed for a fee group, plus the helpers that turn the
 * month/year sent by the browser into a billing period. Kept free of imports so it can be unit-tested without a database.
 *
 * Background (Issue 9): de-enrolling deliberately keeps the student's fee record (StudentTermFee) so fee history survives,
 * so that record alone is NOT proof of enrolment. A student is billed for a fee group only while they have at least one
 * live subject enrolment in it (leaving Punjabi but staying in Kirtan, in the same group, keeps the group fee unchanged).
 *
 * What can and cannot be proven:
 *  - "Enrolled now" is exact: a live Enrollment row exists.
 *  - Whether a student was enrolled during an earlier period is only knowable when a de-enrolment HISTORY record exists
 *    (written by the Issue 10 change). Older de-enrolments have no date, so they are reported as "date unknown" and are
 *    never guessed at. Enrolment dates are never invented.
 *  - A billing period is skipped for a student who has a live enrolment ONLY when it is provably inside a gap: a history
 *    record shows they left before the period began, and every live enrolment started (row created) after the period ended.
 */

export type LiveEnrollment = { createdAt: Date | string };
export type HistoryEntry = { enrolledAt: Date | string | null; endedAt: Date | string; subjectName?: string | null };
export type BillingPeriod = { start: Date; end: Date; label: string };

export type SkipCode = 'STUDENT_NOT_FOUND' | 'NO_FEE_RECORD' | 'NO_AKAAL_ID' | 'ALREADY_BILLED' | 'FEE_EXEMPT' | 'LEFT_FEE_GROUP' | 'NO_ENROLLMENT_NO_HISTORY' | 'NOT_ENROLLED_IN_BILLING_PERIOD';

export type EligibilityDecision =
    | { eligible: true }
    | { eligible: false; code: Extract<SkipCode, 'LEFT_FEE_GROUP' | 'NO_ENROLLMENT_NO_HISTORY' | 'NOT_ENROLLED_IN_BILLING_PERIOD'>; reason: string; evidence: { leftOn?: string; reEnrolledOn?: string } };

export const SKIP_REASON_TEXT: Record<Exclude<SkipCode, 'LEFT_FEE_GROUP' | 'NO_ENROLLMENT_NO_HISTORY' | 'NOT_ENROLLED_IN_BILLING_PERIOD'>, string> = {
    STUDENT_NOT_FOUND: 'No student with this ID was found.',
    NO_FEE_RECORD: 'The student has no fee record for this term and fee group, so there is nothing to bill against.',
    NO_AKAAL_ID: 'The student has no Akaal ID, so a valid invoice number cannot be made.',
    ALREADY_BILLED: 'An invoice for this fee template already exists for this student. No second invoice was created.',
    FEE_EXEMPT: 'The student has a fee exemption that covers this billing period, so no invoice was created.'
};

/**
 * Fee exemption (SOW item 20, B5). An exemption is a pair of dates (both days included, Melbourne time) that an admin switches on.
 * No invoice is made for the student while the exemption is on and either (a) its dates overlap the month being invoiced, or
 * (b) it is live today. Rule (a) stops a late-run invoice for an exempt month, rule (b) is the scope wording ("while it is live").
 * A switched-off exemption is never passed in here.
 */
export type ExemptionWindow = { startDate: Date | string; endDate: Date | string };
export const findCoveringExemption = <T extends ExemptionWindow>(exemptions: T[], period: BillingPeriod, now: Date = new Date()): T | null => {
    const nowTime = now.getTime();
    return (
        exemptions.find((e) => {
            const start = toTime(e.startDate);
            const end = toTime(e.endDate);
            const overlapsPeriod = start <= period.end.getTime() && end >= period.start.getTime();
            const liveNow = start <= nowTime && end >= nowTime;
            return overlapsPeriod || liveNow;
        }) ?? null
    );
};

const toTime = (value: Date | string): number => (value instanceof Date ? value : new Date(value)).getTime();
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "14 Jun 2026" in Melbourne time. Built from numeric parts so the text never depends on the machine's locale data. */
const fmtDate = (value: Date | string): string => {
    const d = value instanceof Date ? value : new Date(value);
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Australia/Melbourne', day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    return `${get('day')} ${MONTH_ABBR[get('month') - 1]} ${get('year')}`;
};
/** The skip message shown to the admin, with the exemption dates. */
export const exemptionSkipReason = (e: ExemptionWindow): string => `The student has a fee exemption from ${fmtDate(e.startDate)} to ${fmtDate(e.endDate)} that covers this invoice, so no invoice was created.`;

/* ------------------------------------------------------------------ */
/* Billing period from the month/year the browser sends                */
/* ------------------------------------------------------------------ */

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MELBOURNE = 'Australia/Melbourne';

/** Milliseconds the zone is ahead of UTC at this instant. */
const zoneOffsetMs = (instant: Date, timeZone: string): number => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(instant);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
};

/** The instant at which the given calendar date begins in the school's time zone (Melbourne). */
export const melbourneMidnight = (year: number, monthIndex: number, day: number): Date => {
    const naive = Date.UTC(year, monthIndex, day, 0, 0, 0);
    let guess = naive - zoneOffsetMs(new Date(naive), MELBOURNE);
    const corrected = naive - zoneOffsetMs(new Date(guess), MELBOURNE);
    if (corrected !== guess) guess = corrected;
    return new Date(guess);
};

export type ParsedPeriod = { ok: true; period: BillingPeriod; monthNumber: number; year: number } | { ok: false; error: string };

/**
 * The month name ("july") and year ("2026") come from the browser. They are validated strictly here (a bad month used to
 * produce an invoice number ending "NaN"). The period is the whole calendar month in Melbourne time.
 */
export const parseBillingPeriod = (month: string, year: string): ParsedPeriod => {
    const monthIndex = MONTHS.indexOf(String(month ?? '').trim().toLowerCase());
    if (monthIndex < 0) return { ok: false, error: `"${month}" is not a valid month name. Use a full English month name such as "July".` };
    const yearNumber = Number(String(year ?? '').trim());
    if (!/^\d{4}$/.test(String(year ?? '').trim()) || yearNumber < 2000 || yearNumber > 2100) return { ok: false, error: `"${year}" is not a valid four-digit year.` };
    const start = melbourneMidnight(yearNumber, monthIndex, 1);
    const nextMonthStart = monthIndex === 11 ? melbourneMidnight(yearNumber + 1, 0, 1) : melbourneMidnight(yearNumber, monthIndex + 1, 1);
    const end = new Date(nextMonthStart.getTime() - 1);
    const label = `${MONTHS[monthIndex][0].toUpperCase()}${MONTHS[monthIndex].slice(1)} ${yearNumber}`;
    return { ok: true, period: { start, end, label }, monthNumber: monthIndex + 1, year: yearNumber };
};

/** Information only (never blocks): the billing period is not the current Melbourne month. Existing backdating is allowed. */
export const periodWarning = (period: BillingPeriod, now: Date = new Date()): string | null => {
    if (now.getTime() >= period.start.getTime() && now.getTime() <= period.end.getTime()) return null;
    const when = now.getTime() < period.start.getTime() ? 'a future period' : 'a past period';
    return `The billing period is ${period.label}, ${when}: today is ${fmtDate(now)} by the server clock. The invoices were created as requested; please check the month is the one you intended.`;
};

/* ------------------------------------------------------------------ */
/* Eligibility                                                         */
/* ------------------------------------------------------------------ */

/**
 * @param live     the student's live enrolments in THIS fee group (any subject of the group counts)
 * @param history  the student's de-enrolment history records for this fee group (may be empty)
 * @param period   the billing period of the invoice (month/year of the template)
 */
export function decideInvoiceEligibility(input: { live: LiveEnrollment[]; history: HistoryEntry[]; period?: BillingPeriod | null }): EligibilityDecision {
    const { live, history, period } = input;

    // 1. No live enrolment in the fee group: not billable (this is the 4 July Kirtan problem).
    if (live.length === 0) {
        if (history.length > 0) {
            const latest = history.reduce((a, b) => (toTime(b.endedAt) > toTime(a.endedAt) ? b : a));
            return {
                eligible: false,
                code: 'LEFT_FEE_GROUP',
                reason: `Left this fee group on ${fmtDate(latest.endedAt)} (de-enrolment record). No invoice is raised for a student who has left.`,
                evidence: { leftOn: new Date(toTime(latest.endedAt)).toISOString() }
            };
        }
        return {
            eligible: false,
            code: 'NO_ENROLLMENT_NO_HISTORY',
            reason: 'Not currently enrolled in any subject of this fee group. There is no de-enrolment record (the student left before history was kept), so the date they left is unknown.',
            evidence: {}
        };
    }

    // 2. Enrolled now. The group fee continues (also when only some subjects were dropped). Skip only a period that is
    //    provably inside a gap: left before the period began AND every live enrolment started after the period ended.
    if (period && history.length > 0) {
        const periodStart = period.start.getTime();
        const periodEnd = period.end.getTime();
        const intervals = [
            ...history.map((h) => ({ start: h.enrolledAt === null ? Number.NEGATIVE_INFINITY : toTime(h.enrolledAt), end: toTime(h.endedAt) })),
            ...live.map((l) => ({ start: toTime(l.createdAt), end: Number.POSITIVE_INFINITY }))
        ];
        const overlapsPeriod = intervals.some((i) => i.start <= periodEnd && i.end >= periodStart);
        const leftBeforePeriod = history.filter((h) => toTime(h.endedAt) < periodStart);
        if (!overlapsPeriod && leftBeforePeriod.length > 0) {
            const leftOn = leftBeforePeriod.reduce((a, b) => (toTime(b.endedAt) > toTime(a.endedAt) ? b : a)).endedAt;
            const earliestLive = live.reduce((a, b) => (toTime(b.createdAt) < toTime(a.createdAt) ? b : a)).createdAt;
            return {
                eligible: false,
                code: 'NOT_ENROLLED_IN_BILLING_PERIOD',
                reason: `Not enrolled during ${period.label}: left on ${fmtDate(leftOn)} and enrolled again on ${fmtDate(earliestLive)}.`,
                evidence: { leftOn: new Date(toTime(leftOn)).toISOString(), reEnrolledOn: new Date(toTime(earliestLive)).toISOString() }
            };
        }
    }
    return { eligible: true };
}
