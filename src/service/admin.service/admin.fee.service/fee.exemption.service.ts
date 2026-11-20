import { db } from '../../../utils/db.server';
import { customError } from '../../../utils/customError';
import { recordStudentProfileActivity } from '../admin.student.service/admin.student.activity.service/admin.student.activity.service';
import { melbourneMidnight } from './fee.eligibility.rules';

/**
 * Fee exemption between two dates (SOW item 20, B5).
 * An exemption is switched on until an admin switches it off (the row is kept as history). Invoice generation reads the ones that
 * are switched on (see createFeeTemplateAndPayments). Dates are whole days in Melbourne time, both days included.
 */
export type ExemptionActor = { userId?: number; email?: string };
export type ExemptionStatus = 'LIVE' | 'UPCOMING' | 'ENDED' | 'OFF';

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "2026-11-20" -> the Melbourne midnight that starts that day, or null when it is not a real calendar day. */
const parseDay = (value: unknown): { start: Date; endOfDay: Date } | null => {
    const m = DAY_RE.exec(String(value ?? '').trim());
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
    const start = melbourneMidnight(year, month - 1, day);
    const endOfDay = new Date(melbourneMidnight(year, month - 1, day + 1).getTime() - 1);
    return { start, endOfDay };
};

export const exemptionStatus = (e: { isActive: boolean; startDate: Date; endDate: Date }, now: Date = new Date()): ExemptionStatus => {
    if (!e.isActive) return 'OFF';
    if (e.endDate.getTime() < now.getTime()) return 'ENDED';
    if (e.startDate.getTime() > now.getTime()) return 'UPCOMING';
    return 'LIVE';
};

const withStatus = <T extends { isActive: boolean; startDate: Date; endDate: Date }>(row: T) => ({ ...row, status: exemptionStatus(row) });

/**
 * Switched-on exemptions for a set of students, for invoice generation. If the table does not exist yet (the API was updated before
 * the database change was applied) this returns nothing and logs a warning, so invoice generation keeps working as before.
 */
export async function loadActiveExemptions(studentIds: number[]) {
    const byStudent = new Map<number, { id: number; startDate: Date; endDate: Date }[]>();
    try {
        const rows = await db.feeExemption.findMany({ where: { studentId: { in: studentIds }, isActive: true }, select: { id: true, studentId: true, startDate: true, endDate: true } });
        for (const row of rows) byStudent.set(row.studentId, [...(byStudent.get(row.studentId) ?? []), row]);
    } catch (error) {
        console.warn('[admin.fee] fee exemptions could not be read (is the FeeExemption table applied?). Invoices are generated without the exemption check.', error instanceof Error ? error.message : error);
    }
    return byStudent;
}

const studentSelect = { id: true, akaalId: true, isActive: true, role: true, personalDetails: { select: { firstName: true, lastName: true } } } as const;

export async function listFeeExemptions(search?: string) {
    const term = (search ?? '').trim();
    const rows = await db.feeExemption.findMany({
        where: term
            ? {
                  student: {
                      OR: [
                          { personalDetails: { firstName: { contains: term, mode: 'insensitive' } } },
                          { personalDetails: { lastName: { contains: term, mode: 'insensitive' } } },
                          ...(Number.isInteger(Number(term)) ? [{ akaalId: Number(term) }] : [])
                      ]
                  }
              }
            : undefined,
        include: { student: { select: studentSelect } },
        orderBy: [{ createdAt: 'desc' }],
        take: 500
    });
    return rows.map(withStatus);
}

/** What the student profile shows: switched-on exemptions that are live now or still to come. */
export async function getStudentFeeExemptions(studentId: number) {
    const rows = await db.feeExemption.findMany({ where: { studentId }, orderBy: [{ startDate: 'desc' }] });
    return rows.map(withStatus);
}

export async function createFeeExemption(input: { studentId: number; startDate: string; endDate: string; reason?: string }, actor: ExemptionActor) {
    const start = parseDay(input.startDate);
    const end = parseDay(input.endDate);
    if (!start || !end) throw customError('Enter the start and end dates as real calendar dates.', 'fail', 400, true);
    if (end.endOfDay.getTime() < start.start.getTime()) throw customError('The end date cannot be before the start date.', 'fail', 400, true);
    if (!Number.isInteger(input.studentId) || input.studentId <= 0) throw customError('Choose a student.', 'fail', 400, true);
    const student = await db.student.findUnique({ where: { id: input.studentId }, select: { id: true } });
    if (!student) throw customError('No student with this ID was found.', 'fail', 404, true);

    const overlapping = await db.feeExemption.findFirst({
        where: { studentId: input.studentId, isActive: true, startDate: { lte: end.endOfDay }, endDate: { gte: start.start } }
    });
    if (overlapping) throw customError('This student already has an exemption that overlaps these dates. Switch it off first, or choose different dates.', 'fail', 400, true);

    const reason = (input.reason ?? '').trim().slice(0, 300);
    const created = await db.feeExemption.create({
        data: {
            studentId: input.studentId,
            startDate: start.start,
            endDate: end.endOfDay,
            reason: reason || null,
            createdByUserId: actor.userId ?? null,
            createdByEmail: actor.email ?? null
        }
    });
    await recordStudentProfileActivity({
        studentId: input.studentId,
        actionType: 'FEE_EXEMPTION_ADDED',
        description: `Fee exemption added (${input.startDate} to ${input.endDate})`,
        metadata: { exemptionId: created.id, startDate: input.startDate, endDate: input.endDate, reason: reason || undefined },
        performedByUserId: actor.userId,
        performedByEmail: actor.email ?? 'System'
    }).catch(() => {});
    return withStatus(created);
}

export async function switchOffFeeExemption(id: number, actor: ExemptionActor) {
    const existing = await db.feeExemption.findUnique({ where: { id } });
    if (!existing) throw customError('No fee exemption with this ID was found.', 'fail', 404, true);
    if (!existing.isActive) return withStatus(existing);
    const updated = await db.feeExemption.update({ where: { id }, data: { isActive: false, endedAt: new Date(), endedByEmail: actor.email ?? null } });
    await recordStudentProfileActivity({
        studentId: existing.studentId,
        actionType: 'FEE_EXEMPTION_ENDED',
        description: 'Fee exemption switched off',
        metadata: { exemptionId: id },
        performedByUserId: actor.userId,
        performedByEmail: actor.email ?? 'System'
    }).catch(() => {});
    return withStatus(updated);
}

/** For the picker on the exemption page: active students matching a name or an Akaal ID, at most 10. */
export async function findStudentsForExemption(search: string) {
    const term = search.trim();
    if (term.length < 2) return [];
    const rows = await db.student.findMany({
        where: {
            isActive: true,
            role: 'STUDENT',
            OR: [
                { personalDetails: { firstName: { contains: term, mode: 'insensitive' } } },
                { personalDetails: { lastName: { contains: term, mode: 'insensitive' } } },
                ...(Number.isInteger(Number(term)) ? [{ akaalId: Number(term) }] : [])
            ]
        },
        select: studentSelect,
        orderBy: { akaalId: 'asc' },
        take: 10
    });
    return rows.map((r) => ({ id: r.id, akaalId: r.akaalId, name: `${r.personalDetails?.firstName ?? ''} ${r.personalDetails?.lastName ?? ''}`.trim() }));
}
