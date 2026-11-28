/**
 * BECS Direct Debit settings (Administration > Direct Debit): master switch, who may use it, when the debit run happens,
 * reminders, the office alert address, and the list of families allowed when access is "selected families".
 * Kept separate from directDebit.service.ts (Stripe + debiting); that file reads these settings.
 */
import { DirectDebitAccess, DirectDebitRunFrequency } from '@prisma/client';
import { db } from '../../utils/db.server';
import { customError } from '../../utils/customError';

export type DirectDebitSettingsView = {
    enabled: boolean;
    access: DirectDebitAccess;
    runTime: string;
    frequency: DirectDebitRunFrequency;
    runWeekday: number;
    runMonthDay: number;
    runQuarterMonth: number;
    reminderDaysBefore: number;
    allowPayExistingBalance: boolean;
    officeEmail: string | null;
    lastRunAt: Date | null;
    lastRunSummary: string | null;
    lastReminderRunAt: Date | null;
    updatedAt: Date | null;
    updatedBy: string | null;
};

/** Used if the settings row is missing (migration not applied yet): direct debit stays OFF. */
const DEFAULTS: DirectDebitSettingsView = {
    enabled: false,
    access: 'SELECTED_FAMILIES',
    runTime: '07:00',
    frequency: 'DAILY',
    runWeekday: 1,
    runMonthDay: 1,
    runQuarterMonth: 1,
    reminderDaysBefore: 3,
    allowPayExistingBalance: true,
    officeEmail: null,
    lastRunAt: null,
    lastRunSummary: null,
    lastReminderRunAt: null,
    updatedAt: null,
    updatedBy: null
};

export async function getDirectDebitSettings(): Promise<DirectDebitSettingsView> {
    const row = await db.directDebitSettings.findUnique({ where: { id: 1 } });
    if (!row) return DEFAULTS;
    const { id: _id, ...rest } = row;
    return rest;
}

export type DirectDebitSettingsInput = Partial<
    Pick<
        DirectDebitSettingsView,
        | 'enabled'
        | 'access'
        | 'runTime'
        | 'frequency'
        | 'runWeekday'
        | 'runMonthDay'
        | 'runQuarterMonth'
        | 'reminderDaysBefore'
        | 'allowPayExistingBalance'
        | 'officeEmail'
    >
>;

export async function updateDirectDebitSettings(input: DirectDebitSettingsInput, adminEmail: string) {
    if (input.runTime !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.runTime)) {
        throw customError('Run time must be HH:MM (24-hour), for example 07:00.', 'fail', 400, true);
    }
    if (input.runWeekday !== undefined && !(input.runWeekday >= 0 && input.runWeekday <= 6)) {
        throw customError('Day of the week must be 0 (Sunday) to 6 (Saturday).', 'fail', 400, true);
    }
    if (input.runMonthDay !== undefined && !((input.runMonthDay >= 1 && input.runMonthDay <= 28) || input.runMonthDay === 31)) {
        throw customError('Day of the month must be 1 to 28, or the last day.', 'fail', 400, true);
    }
    if (input.runQuarterMonth !== undefined && ![1, 2, 3].includes(input.runQuarterMonth)) {
        throw customError('Month of the quarter must be 1, 2 or 3.', 'fail', 400, true);
    }
    if (input.reminderDaysBefore !== undefined && (input.reminderDaysBefore < 0 || input.reminderDaysBefore > 14)) {
        throw customError('Reminder days must be between 0 and 14.', 'fail', 400, true);
    }
    const officeEmail = input.officeEmail === undefined ? undefined : input.officeEmail?.trim() || null;
    const data = { ...input, officeEmail, updatedBy: adminEmail };
    await db.directDebitSettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
    return getDirectDebitSettings();
}

const normEmail = (email: string) => email.trim().toLowerCase();

/** Whether this family login may use direct debit right now (master switch + access rule). */
export async function isFamilyAllowed(email: string, settings?: DirectDebitSettingsView): Promise<boolean> {
    const s = settings ?? (await getDirectDebitSettings());
    if (!s.enabled) return false;
    if (s.access === 'ALL_FAMILIES') return true;
    return (await db.directDebitFamilyAccess.count({ where: { email: normEmail(email) } })) > 0;
}

/** Emails allowed under the current settings, or null when every family is allowed. Empty set when switched off. */
export async function allowedEmails(settings?: DirectDebitSettingsView): Promise<Set<string> | null> {
    const s = settings ?? (await getDirectDebitSettings());
    if (!s.enabled) return new Set();
    if (s.access === 'ALL_FAMILIES') return null;
    const rows = await db.directDebitFamilyAccess.findMany({ select: { email: true } });
    return new Set(rows.map((r) => r.email));
}

// ---------- families ----------

type FamilyStudent = { id: number; akaalId: number | null; name: string; role: string; isActive: boolean };

async function studentsByEmail(emails: string[]): Promise<Map<string, FamilyStudent[]>> {
    const map = new Map<string, FamilyStudent[]>();
    if (!emails.length) return map;
    const rows = await db.personalDetails.findMany({
        where: { OR: emails.map((e) => ({ email: { equals: e, mode: 'insensitive' as const } })) },
        select: { email: true, firstName: true, lastName: true, student: { select: { id: true, akaalId: true, role: true, isActive: true } } }
    });
    for (const r of rows) {
        if (!r.student) continue;
        const key = normEmail(r.email);
        const list = map.get(key) ?? [];
        list.push({ id: r.student.id, akaalId: r.student.akaalId, name: `${r.firstName} ${r.lastName}`.trim(), role: r.student.role, isActive: r.student.isActive });
        map.set(key, list);
    }
    return map;
}

/** Families tab: every family that has started direct debit, with students, bank, last debit and access. */
export async function listDirectDebitFamilies() {
    const [mandates, access, settings] = await Promise.all([
        db.directDebitMandate.findMany({ orderBy: { updatedAt: 'desc' }, include: { charges: { orderBy: { createdAt: 'desc' }, take: 1 } } }),
        db.directDebitFamilyAccess.findMany({ select: { email: true } }),
        getDirectDebitSettings()
    ]);
    const allowed = new Set(access.map((a) => a.email));
    const students = await studentsByEmail(mandates.map((m) => m.email));
    const totals = await db.directDebitCharge.groupBy({ by: ['mandateId'], where: { status: 'SUCCEEDED' }, _sum: { amount: true } });
    const collected = new Map(totals.map((t) => [t.mandateId, t._sum.amount ?? 0]));
    return mandates.map((m) => {
        const last = m.charges[0];
        return {
            id: m.id,
            email: m.email,
            status: m.status,
            bsbNumber: m.bsbNumber,
            bankLast4: m.bankLast4,
            activatedAt: m.activatedAt,
            cancelledAt: m.cancelledAt,
            statusReason: m.statusReason,
            statusChangedBy: m.statusChangedBy,
            hasAccess: settings.access === 'ALL_FAMILIES' || allowed.has(normEmail(m.email)),
            students: students.get(normEmail(m.email)) ?? [],
            totalCollected: collected.get(m.id) ?? 0,
            lastCharge: last ? { amount: last.amount, status: last.status, disputed: last.disputed, createdAt: last.createdAt } : null
        };
    });
}

// ---------- access list ----------

export async function listFamilyAccess() {
    const rows = await db.directDebitFamilyAccess.findMany({ orderBy: { createdAt: 'desc' } });
    const students = await studentsByEmail(rows.map((r) => r.email));
    const mandates = await db.directDebitMandate.findMany({
        where: { OR: rows.map((r) => ({ email: { equals: r.email, mode: 'insensitive' as const } })) },
        select: { email: true, status: true }
    });
    const mandateStatus = new Map(mandates.map((m) => [normEmail(m.email), m.status]));
    return rows.map((r) => ({
        id: r.id,
        email: r.email,
        addedBy: r.addedBy,
        createdAt: r.createdAt,
        students: students.get(r.email) ?? [],
        mandateStatus: mandateStatus.get(r.email) ?? null
    }));
}

export async function addFamilyAccess(email: string, adminEmail: string) {
    const e = normEmail(email);
    const login = await db.user.findFirst({ where: { email: { equals: e, mode: 'insensitive' }, role: 'STUDENT' }, select: { id: true } });
    if (!login) throw customError('No parent/student login uses this email.', 'fail', 400, true);
    await db.directDebitFamilyAccess.upsert({ where: { email: e }, update: {}, create: { email: e, addedBy: adminEmail } });
    return listFamilyAccess();
}

export async function removeFamilyAccess(id: number) {
    await db.directDebitFamilyAccess.deleteMany({ where: { id } });
    return listFamilyAccess();
}

/** Access tab search: family logins by student name, Akaal ID or email. One row per login email. */
export async function searchFamilies(search: string) {
    const q = search.trim();
    if (q.length < 2) return [];
    const asNumber = /^\d+$/.test(q) ? Number(q) : null;
    const rows = await db.personalDetails.findMany({
        where: {
            OR: [
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                ...(asNumber !== null ? [{ student: { akaalId: asNumber } }] : [])
            ],
            student: { role: { in: ['STUDENT', 'ALUMNI'] } }
        },
        select: { email: true },
        take: 40
    });
    const emails = [...new Set(rows.map((r) => normEmail(r.email)).filter(Boolean))].slice(0, 15);
    if (!emails.length) return [];
    const [logins, access, students, mandates] = await Promise.all([
        db.user.findMany({ where: { OR: emails.map((e) => ({ email: { equals: e, mode: 'insensitive' as const } })), role: 'STUDENT' }, select: { email: true } }),
        db.directDebitFamilyAccess.findMany({ where: { email: { in: emails } }, select: { email: true } }),
        studentsByEmail(emails),
        db.directDebitMandate.findMany({ where: { OR: emails.map((e) => ({ email: { equals: e, mode: 'insensitive' as const } })) }, select: { email: true, status: true } })
    ]);
    const mandateStatus = new Map(mandates.map((m) => [normEmail(m.email), m.status]));
    const hasLogin = new Set(logins.map((l) => normEmail(l.email)));
    const allowed = new Set(access.map((a) => a.email));
    return emails.map((e) => ({
        email: e,
        hasLogin: hasLogin.has(e),
        hasAccess: allowed.has(e),
        mandateStatus: mandateStatus.get(e) ?? null,
        students: students.get(e) ?? []
    }));
}

// ---------- activity ----------

export async function listRecentCharges(limit = 50) {
    const charges = await db.directDebitCharge.findMany({
        orderBy: { createdAt: 'desc' },
        take: Math.min(Math.max(limit, 1), 200),
        include: { mandate: { select: { email: true } } }
    });
    const students = await db.student.findMany({
        where: { id: { in: [...new Set(charges.map((c) => c.studentId))] } },
        select: { id: true, akaalId: true, personalDetails: { select: { firstName: true, lastName: true } } }
    });
    const invoices = await db.feePayment.findMany({
        where: { id: { in: [...new Set(charges.map((c) => c.feePaymentId))] } },
        select: { id: true, invoiceId: true, feeTemplate: { select: { invoiceName: true } } }
    });
    const sById = new Map(students.map((s) => [s.id, s]));
    const iById = new Map(invoices.map((i) => [i.id, i]));
    return charges.map((c) => {
        const s = sById.get(c.studentId);
        const inv = iById.get(c.feePaymentId);
        return {
            id: c.id,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            familyEmail: c.mandate.email,
            studentId: c.studentId,
            akaalId: s?.akaalId ?? null,
            studentName: s?.personalDetails ? `${s.personalDetails.firstName} ${s.personalDetails.lastName}`.trim() : 'Student',
            invoiceNumber: inv?.invoiceId ?? null,
            invoiceName: inv?.feeTemplate?.invoiceName ?? null,
            amount: c.amount,
            reason: c.reason,
            status: c.status,
            disputed: c.disputed,
            failureMessage: c.failureMessage,
            officeAcknowledgedAt: c.officeAcknowledgedAt
        };
    });
}

// ---------- schedule ----------

type ScheduleFields = Pick<DirectDebitSettingsView, 'enabled' | 'runTime' | 'frequency' | 'runWeekday' | 'runMonthDay' | 'runQuarterMonth' | 'lastRunAt'>;

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
const QUARTER_MONTHS: Record<number, string> = { 1: 'Jan, Apr, Jul and Oct', 2: 'Feb, May, Aug and Nov', 3: 'Mar, Jun, Sep and Dec' };

/** Day of the month the run happens in this month (31 = last day; a day past the month's end also means the last day). */
function monthRunDay(s: ScheduleFields, year: number, month: number) {
    const last = new Date(year, month + 1, 0).getDate();
    return Math.min(s.runMonthDay, last);
}

/** Whether the debit run happens on this calendar day (process timezone = school time). */
export function isRunDay(s: ScheduleFields, day: Date): boolean {
    const wd = day.getDay();
    switch (s.frequency) {
        case 'DAILY':
            return true;
        case 'WEEKDAYS':
            return wd !== 0 && wd !== 6;
        case 'WEEKLY':
            return wd === s.runWeekday;
        case 'MONTHLY':
            return day.getDate() === monthRunDay(s, day.getFullYear(), day.getMonth());
        case 'QUARTERLY':
            return day.getMonth() % 3 === s.runQuarterMonth - 1 && day.getDate() === monthRunDay(s, day.getFullYear(), day.getMonth());
        default:
            return false;
    }
}

/** Plain-English schedule, e.g. "every Monday at 07:00" (Settings tab, parent panel, emails). */
export function describeSchedule(s: ScheduleFields): string {
    const day = s.runMonthDay === 31 ? 'the last day' : `the ${ordinal(s.runMonthDay)}`;
    switch (s.frequency) {
        case 'DAILY':
            return 'every day';
        case 'WEEKDAYS':
            return 'every weekday (Monday to Friday)';
        case 'WEEKLY':
            return `every ${WEEKDAY_NAMES[s.runWeekday]}`;
        case 'MONTHLY':
            return `on ${day} of every month`;
        case 'QUARTERLY':
            return `on ${day} of ${QUARTER_MONTHS[s.runQuarterMonth]}`;
        default:
            return '';
    }
}

/**
 * The first debit run at or after `from`: today counts only if today is a run day and today's run has not happened yet.
 * Returns the run time on that day. Looks ahead up to ~13 months.
 */
export function nextRunOnOrAfter(s: ScheduleFields, from: Date, now = new Date()): Date | null {
    const [h, m] = s.runTime.split(':').map(Number);
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    for (let add = 0; add < 400; add++) {
        const d = new Date(start);
        d.setDate(d.getDate() + add);
        if (!isRunDay(s, d)) continue;
        if (d.getTime() === today.getTime() && s.lastRunAt && new Date(s.lastRunAt) >= today) continue; // today's run done
        if (d < today) continue;
        d.setHours(h, m, 0, 0);
        // Today's run time has passed but the run has not happened: the scheduler runs it within the minute.
        return d < now ? new Date(now) : d;
    }
    return null;
}

/** Next scheduled run, for the Settings tab. */
export function nextRunAt(s: ScheduleFields, now = new Date()): Date | null {
    if (!s.enabled) return null;
    return nextRunOnOrAfter(s, now, now);
}

function hhmmNow(now: Date) {
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * Called every minute by the cron. Returns true (and records lastRunAt) once on each run day, at or after the run time,
 * when direct debit is switched on. One conditional update, so two processes cannot both run it.
 */
export async function claimScheduledRun(now = new Date()): Promise<boolean> {
    const s = await getDirectDebitSettings();
    if (!s.enabled || !isRunDay(s, now) || hhmmNow(now) < s.runTime) return false;
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const claimed = await db.directDebitSettings.updateMany({
        where: { id: 1, OR: [{ lastRunAt: null }, { lastRunAt: { lt: startOfToday } }] },
        data: { lastRunAt: now }
    });
    return claimed.count === 1;
}

/** Reminder emails: once EVERY day at the run time (whatever the debit frequency), so notice is given before each debit day. */
export async function claimReminderRun(now = new Date()): Promise<boolean> {
    const s = await getDirectDebitSettings();
    if (!s.enabled || s.reminderDaysBefore <= 0 || hhmmNow(now) < s.runTime) return false;
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const claimed = await db.directDebitSettings.updateMany({
        where: { id: 1, OR: [{ lastReminderRunAt: null }, { lastReminderRunAt: { lt: startOfToday } }] },
        data: { lastReminderRunAt: now }
    });
    return claimed.count === 1;
}

export async function recordRunSummary(summary: string) {
    await db.directDebitSettings.updateMany({ where: { id: 1 }, data: { lastRunSummary: summary.slice(0, 500) } });
}
