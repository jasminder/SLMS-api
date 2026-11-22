import { db } from '../../utils/db.server';
import { WATCHLIST_CLASS_NAME, evaluateStudent } from './attendance.watchlist.rules';

/**
 * Weekly absence list (Scope of Work item 24).
 *
 * Flags are the existing SkipReport records, so a flagged student also shows in the existing "Students with Flags" card and
 * the existing Clear (close a flag) action works on them. Automatic flags are told apart by className = WATCHLIST_CLASS_NAME,
 * with no teacher and no admin. The weekly job (cron/weeklyAbsenceWatchlist.ts) creates them; nothing else does.
 */

type StudentWithDays = {
    id: number;
    akaalId: number | null;
    schoolCheckInAttendance: { date: Date; checkedIn: boolean; isOnLeave: boolean }[];
};

async function loadStudentsWithDays(termStart: Date, asOf: Date): Promise<StudentWithDays[]> {
    return db.student.findMany({
        where: { role: 'STUDENT', isActive: true, schoolCheckInAttendance: { some: { date: { gte: termStart, lte: asOf } } } },
        select: {
            id: true,
            akaalId: true,
            schoolCheckInAttendance: { where: { date: { gte: termStart, lte: asOf } }, select: { date: true, checkedIn: true, isOnLeave: true } }
        }
    }) as unknown as StudentWithDays[];
}

/** Open and closed automatic flags, keyed by student, so a cleared student is only flagged again after a new absence. */
async function loadAutomaticFlags() {
    const flags = await db.skipReport.findMany({ where: { className: WATCHLIST_CLASS_NAME }, select: { id: true, studentId: true, isClosed: true, updatedAt: true, createdAt: true, reason: true } });
    const open = new Map<number, (typeof flags)[number]>();
    const lastClearedAt = new Map<number, Date>();
    for (const flag of flags) {
        if (!flag.isClosed) open.set(flag.studentId, flag);
        else {
            const clearedAt = flag.updatedAt ?? flag.createdAt ?? null;
            const previous = lastClearedAt.get(flag.studentId);
            if (clearedAt && (!previous || clearedAt > previous)) lastClearedAt.set(flag.studentId, clearedAt);
        }
    }
    return { open, lastClearedAt };
}

async function currentTermStart(): Promise<Date | null> {
    const term = await db.term.findFirst({ where: { currentTerm: true }, select: { startDate: true } });
    return term?.startDate ?? null;
}

/** Runs once a week (Friday morning). Creates a flag, with the reason recorded, for each student who now qualifies. */
export async function runWeeklyAbsenceFlagging(asOf: Date = new Date()) {
    const termStart = await currentTermStart();
    if (!termStart) return { created: 0, alreadyFlagged: 0, checked: 0 };
    const [students, flags] = await Promise.all([loadStudentsWithDays(termStart, asOf), loadAutomaticFlags()]);

    let created = 0;
    let alreadyFlagged = 0;
    for (const student of students) {
        if (flags.open.has(student.id)) {
            alreadyFlagged++;
            continue;
        }
        const result = evaluateStudent(student.schoolCheckInAttendance, termStart, asOf, flags.lastClearedAt.get(student.id) ?? null);
        if (!result.isCandidate) continue;
        await db.skipReport.create({ data: { studentId: student.id, date: asOf, reason: result.reasons.join('. '), className: WATCHLIST_CLASS_NAME } });
        created++;
    }
    return { created, alreadyFlagged, checked: students.length };
}

/** What the dashboard card shows: every open automatic flag, with the student's current numbers. */
export async function listAbsenceWatchlist(asOf: Date = new Date()) {
    const termStart = await currentTermStart();
    const flags = await db.skipReport.findMany({
        where: { className: WATCHLIST_CLASS_NAME, isClosed: false, student: { isActive: true } },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            reason: true,
            createdAt: true,
            student: { select: { id: true, akaalId: true, personalDetails: { select: { firstName: true, lastName: true } } } }
        }
    });
    if (!termStart || flags.length === 0) return [];

    const days = await db.schoolCheckInAttendance.findMany({
        where: { studentId: { in: flags.map((f) => f.student.id) }, date: { gte: termStart, lte: asOf } },
        select: { studentId: true, date: true, checkedIn: true, isOnLeave: true }
    });
    const byStudent = new Map<number, { date: Date; checkedIn: boolean; isOnLeave: boolean }[]>();
    for (const day of days) byStudent.set(day.studentId, [...(byStudent.get(day.studentId) ?? []), day]);

    return flags
        .map((flag) => {
            const result = evaluateStudent(byStudent.get(flag.student.id) ?? [], termStart, asOf);
            return {
                skipReportId: flag.id,
                studentId: flag.student.id,
                akaalId: flag.student.akaalId,
                name: `${flag.student.personalDetails?.firstName ?? ''} ${flag.student.personalDetails?.lastName ?? ''}`.trim(),
                reason: flag.reason,
                flaggedOn: flag.createdAt,
                absencesInARow: result.absencesInARow,
                termPercent: result.termPercent,
                daysInTerm: result.daysInTerm,
                lastAttendedOn: result.lastAttendedOn
            };
        })
        .sort((a, b) => b.absencesInARow - a.absencesInARow);
}
