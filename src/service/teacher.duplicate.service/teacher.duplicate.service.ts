import type { Prisma } from '@prisma/client';
import { db } from '../../utils/db.server';
import type { AdminWarning, TeacherConflict } from './teacher.duplicate.rules';
import {
    adminConflictMessage,
    identityKey,
    normalizeEmail,
    phonesMatch,
    possibleDuplicateSignals,
    possibleDuplicateWarning,
    sharedPhoneWarning,
    sharedStudentEmailWarning,
    studentLoginOnEmailWarning,
    teacherStatusLabel
} from './teacher.duplicate.rules';

export * from './teacher.duplicate.rules';

/** Works with the normal client and with an interactive-transaction client. */
export type DuplicateReader = Pick<Prisma.TransactionClient, 'teacherPersonalDetails' | 'personalDetails' | 'user' | 'teacherBankDetails'>;
type Locker = Pick<Prisma.TransactionClient, '$executeRaw'>;

/**
 * Raised when a teacher approval or profile edit would create/keep a BLOCKING conflict.
 * Carries the conflicting teacher ids (for authorised admins) and any non-blocking warnings.
 * Controllers turn it into an HTTP 409 with `toResponse()`.
 */
export class TeacherDuplicateError extends Error {
    status = 'fail';
    statusCode = 409;
    isOperational = true;
    conflicts: TeacherConflict[];
    warnings: AdminWarning[];

    constructor(conflicts: TeacherConflict[], warnings: AdminWarning[], context: 'approval' | 'edit') {
        super(conflicts.length > 0 ? adminConflictMessage(conflicts, context) : 'This email is already in use by another record.');
        Object.setPrototypeOf(this, TeacherDuplicateError.prototype);
        this.name = 'TeacherDuplicateError';
        this.conflicts = conflicts;
        this.warnings = warnings;
    }

    toResponse() {
        return { status: 'fail', message: this.message, conflicts: this.conflicts, warnings: this.warnings };
    }
}

/**
 * Serialises work on one name + DOB identity for the rest of the current transaction, so two
 * simultaneous registrations/approvals/edits for the same identity cannot both pass the check.
 * The lock is released automatically when the transaction ends. No schema change is needed.
 */
export async function lockIdentity(client: Locker, key: string): Promise<void> {
    await client.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}

type TeacherRecord = {
    teacherId: number;
    firstName: string;
    lastName: string;
    DOB: Date;
    email: string;
    contact: string;
    address: string;
    postcode: string;
    status: string;
};

/** EVERY teacher record is a candidate: active, inactive and pending applicants alike. */
async function loadTeacherRecords(client: DuplicateReader): Promise<TeacherRecord[]> {
    const rows = await client.teacherPersonalDetails.findMany({
        select: {
            teacherId: true,
            firstName: true,
            lastName: true,
            DOB: true,
            email: true,
            contact: true,
            address: true,
            postcode: true,
            teacher: { select: { role: true, isActive: true } }
        }
    });
    return rows.map((row) => ({
        teacherId: row.teacherId,
        firstName: row.firstName,
        lastName: row.lastName,
        DOB: row.DOB,
        email: row.email,
        contact: row.contact,
        address: row.address,
        postcode: row.postcode,
        status: teacherStatusLabel(row.teacher.role, row.teacher.isActive)
    }));
}

export type TeacherIdentityInput = {
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    DOB?: Date | string | null;
};

type ConflictOptions = {
    /** The teacher being approved/edited: its own record is never a conflict. */
    excludeTeacherId?: number;
    checkEmail?: boolean;
    checkIdentity?: boolean;
};

/**
 * BLOCKING conflicts with other teachers.
 *  - EMAIL: another teacher record uses the email (trimmed, case-insensitive), or a TEACHER/ADMIN login uses it.
 *  - NAME_DOB: another teacher record has the same normalised full name and the same Melbourne calendar-date DOB.
 * A student record or STUDENT login on the email is NOT a conflict here (family sharing is allowed);
 * it is reported as a warning by `findTeacherWarnings`.
 * Shared phone numbers and DOB alone are never conflicts.
 */
export async function findTeacherConflicts(input: TeacherIdentityInput, options: ConflictOptions = {}, client: DuplicateReader = db): Promise<TeacherConflict[]> {
    const { excludeTeacherId, checkEmail = true, checkIdentity = true } = options;
    const email = normalizeEmail(input.email);
    const wantedIdentity = identityKey(input.firstName, input.lastName, input.DOB);
    const conflicts: TeacherConflict[] = [];

    if ((checkEmail && email) || (checkIdentity && wantedIdentity)) {
        const records = await loadTeacherRecords(client);
        for (const record of records) {
            if (excludeTeacherId !== undefined && record.teacherId === excludeTeacherId) continue;
            if (checkEmail && email && normalizeEmail(record.email) === email) {
                conflicts.push({ kind: 'EMAIL', teacherId: record.teacherId, status: record.status });
            }
            if (checkIdentity && wantedIdentity && identityKey(record.firstName, record.lastName, record.DOB) === wantedIdentity) {
                conflicts.push({ kind: 'NAME_DOB', teacherId: record.teacherId, status: record.status });
            }
        }
    }

    if (checkEmail && email) {
        const login = await client.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { role: true, teacherId: true } });
        const belongsToSelf = login !== null && excludeTeacherId !== undefined && login.teacherId === excludeTeacherId;
        if (login && !belongsToSelf && (login.role === 'TEACHER' || login.role === 'ADMIN')) {
            conflicts.push({ kind: 'LOGIN_EMAIL', teacherId: login.teacherId, status: login.role === 'ADMIN' ? 'admin login' : 'teacher login' });
        }
    }
    return conflicts;
}

export type TeacherWarningInput = TeacherIdentityInput & {
    contact?: string | null;
    address?: string | null;
    postcode?: string | null;
    bankBsb?: string | null;
    bankAccount?: string | null;
};

export type WarningChecks = {
    excludeTeacherId?: number;
    phone?: boolean;
    possibleDuplicates?: boolean;
    sharedEmail?: boolean;
};

/**
 * NON-BLOCKING admin warnings. Never throws a conflict.
 *  - SHARED_PHONE: another teacher uses the same phone number.
 *  - POSSIBLE_DUPLICATE: similar name AND the same address or bank account as another teacher (e.g. Teachers 41 and 47).
 *  - SHARED_STUDENT_EMAIL / STUDENT_LOGIN_ON_EMAIL: the email is also a student/family contact email or the login of a STUDENT.
 * Warnings carry ids only; no bank details, addresses or phone numbers are returned.
 */
export async function findTeacherWarnings(input: TeacherWarningInput, checks: WarningChecks = {}, client: DuplicateReader = db): Promise<AdminWarning[]> {
    const { excludeTeacherId, phone = true, possibleDuplicates = true, sharedEmail = true } = checks;
    const warnings: AdminWarning[] = [];

    if (phone || possibleDuplicates) {
        const records = (await loadTeacherRecords(client)).filter((record) => excludeTeacherId === undefined || record.teacherId !== excludeTeacherId);

        if (phone && input.contact) {
            const ids = records.filter((record) => phonesMatch(record.contact, input.contact)).map((record) => record.teacherId);
            if (ids.length > 0) warnings.push(sharedPhoneWarning(ids));
        }

        if (possibleDuplicates) {
            const banks = await client.teacherBankDetails.findMany({ select: { teacherId: true, BSB: true, accountNumber: true } });
            const bankByTeacher = new Map(banks.map((bank) => [bank.teacherId, bank] as const));
            for (const record of records) {
                const bank = bankByTeacher.get(record.teacherId);
                const signals = possibleDuplicateSignals(
                    { firstName: input.firstName, lastName: input.lastName, DOB: input.DOB, address: input.address, postcode: input.postcode, bankBsb: input.bankBsb, bankAccount: input.bankAccount },
                    { firstName: record.firstName, lastName: record.lastName, DOB: record.DOB, address: record.address, postcode: record.postcode, bankBsb: bank?.BSB, bankAccount: bank?.accountNumber }
                );
                if (signals.length > 0) warnings.push(possibleDuplicateWarning(record.teacherId, signals));
            }
        }
    }

    const email = normalizeEmail(input.email);
    if (sharedEmail && email) {
        const students = await client.personalDetails.findMany({
            where: { email: { equals: email, mode: 'insensitive' } },
            select: { studentId: true, student: { select: { akaalId: true } } }
        });
        if (students.length > 0) {
            warnings.push(
                sharedStudentEmailWarning(
                    students.map((student) => student.studentId),
                    students.map((student) => student.student.akaalId)
                )
            );
        }
        const login = await client.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { role: true } });
        if (login && login.role === 'STUDENT') warnings.push(studentLoginOnEmailWarning());
    }
    return warnings;
}

/** True for errors created with customError (safe to show to the caller). */
export const isOperationalError = (error: unknown): boolean => (error as { isOperational?: boolean } | null)?.isOperational === true;
