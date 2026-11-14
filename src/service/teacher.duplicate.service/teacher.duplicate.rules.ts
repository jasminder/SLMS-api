/**
 * Pure (database-free) rules for teacher duplicate detection.
 *
 * Kept free of imports on purpose so the logic can be unit-tested without a database.
 * The database lookups live in `teacher.duplicate.service.ts`.
 *
 * Policy:
 *  BLOCKING (registration, approval, edit):
 *    - another teacher record already uses the email (case-insensitive, trimmed)
 *    - another teacher record has the same normalised full name AND the same date of birth
 *    - a TEACHER or ADMIN login already uses the email
 *  NEVER BLOCKING (shown to admins as warnings only):
 *    - a phone number shared with another teacher
 *    - a possible duplicate (similar name plus the same address or the same bank account)
 *    - an email that is also a student/family contact email, or the email of a STUDENT login
 *  DOB alone, name alone and phone alone never block anything.
 */

/** Trim + lowercase. Used for every teacher email comparison and for storing teacher emails. */
export const normalizeEmail = (email: string | null | undefined): string => (email ?? '').trim().toLowerCase();

/**
 * Digits only, so "0435 920 412", "0435-920-412" and "0435920412" compare equal.
 * Used for COMPARISON only; stored contact values are not rewritten.
 */
export const normalizePhone = (phone: string | null | undefined): string => (phone ?? '').replace(/\D/g, '');

export const phonesMatch = (a: string | null | undefined, b: string | null | undefined): boolean => {
    const x = normalizePhone(a);
    return x.length > 0 && x === normalizePhone(b);
};

/** Trim, lowercase and collapse repeated whitespace. */
export const normalizeName = (value: string | null | undefined): string => (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Normalised "first last" used to decide whether two records have the same name. */
export const fullNameKey = (firstName: string | null | undefined, lastName: string | null | undefined): string => normalizeName(`${firstName ?? ''} ${lastName ?? ''}`);

/**
 * The school is in Melbourne, and stored DOB timestamps depend on the browser time zone of whoever
 * entered them (e.g. 15 Oct 19:30 UTC and 15 Oct 18:30 UTC are both 16 Oct in Melbourne).
 * DOBs are therefore compared as a CALENDAR DATE in Melbourne time, never as an exact timestamp.
 * Existing data is not changed. Returns null for a missing or invalid date.
 */
const MELBOURNE_TIME_ZONE = 'Australia/Melbourne';
let melbourneDayFormatter: Intl.DateTimeFormat | null = null;

export const dobDayKey = (value: Date | string | null | undefined): string | null => {
    if (value === null || value === undefined || value === '') return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    if (melbourneDayFormatter === null) {
        melbourneDayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: MELBOURNE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
    }
    return melbourneDayFormatter.format(date); // en-CA gives YYYY-MM-DD
};

/** "normalised full name|Melbourne calendar date", or null when either part is missing/invalid. */
export const identityKey = (firstName: string | null | undefined, lastName: string | null | undefined, dob: Date | string | null | undefined): string | null => {
    // Both name parts are required: a blank first or last name must never match every "Kaur" with the same DOB.
    if (!normalizeName(firstName) || !normalizeName(lastName)) return null;
    const day = dobDayKey(dob);
    if (!day) return null;
    return `${fullNameKey(firstName, lastName)}|${day}`;
};

/* ------------------------------------------------------------------ */
/* Possible-duplicate signals (warning only, never blocking)           */
/* ------------------------------------------------------------------ */

const PLACEHOLDER_TOKEN = /^x{3,}$/; // e.g. "xxxx" padding that staff add to mark old records

/** Order-insensitive word list of a name, ignoring punctuation and placeholder padding such as "xxxx". Digits are kept ("Kaur 1" is not "Kaur 2"). */
export const nameTokens = (firstName: string | null | undefined, lastName: string | null | undefined): string[] =>
    `${firstName ?? ''} ${lastName ?? ''}`
        .toLowerCase()
        .replace(/[^a-z0-9\sÀ-￿]/g, ' ')
        .split(/\s+/)
        .filter((token) => token.length > 0 && !PLACEHOLDER_TOKEN.test(token))
        .sort();

export const sameNameTokens = (a: string[], b: string[]): boolean => a.length > 0 && a.length === b.length && a.every((token, index) => token === b[index]);

/** Street + postcode, lowercase, punctuation removed. Null for empty or obviously incomplete values (no digit / too short). */
export const addressKey = (address: string | null | undefined, postcode: string | null | undefined): string | null => {
    const street = (address ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const code = (postcode ?? '').replace(/\D/g, '');
    if (street.length < 6 || !/\d/.test(street) || code.length < 4) return null;
    return `${street}|${code}`;
};

/** BSB + account number as digits. Null for empty or placeholder-looking values. Never logged or returned to callers as a value. */
export const bankKey = (bsb: string | null | undefined, accountNumber: string | null | undefined): string | null => {
    const branch = (bsb ?? '').replace(/\D/g, '');
    const account = (accountNumber ?? '').replace(/\D/g, '');
    if (branch.length !== 6 || account.length < 6) return null;
    return `${branch}-${account}`;
};

export type ProfileSignals = {
    firstName: string | null | undefined;
    lastName: string | null | undefined;
    DOB: Date | string | null | undefined;
    address: string | null | undefined;
    postcode: string | null | undefined;
    bankBsb?: string | null;
    bankAccount?: string | null;
};

export type PossibleDuplicateSignal = 'address' | 'bank';

/**
 * Warning-only heuristic. A pair is "possibly the same person" only when the names match after
 * normalisation (word order and placeholder padding ignored) AND at least one corroborating signal
 * matches. An address or a bank account on its own never counts (households and joint accounts are
 * common). Pairs that are already exact name + DOB duplicates are reported as blocking conflicts instead.
 */
export const possibleDuplicateSignals = (a: ProfileSignals, b: ProfileSignals): PossibleDuplicateSignal[] => {
    const keyA = identityKey(a.firstName, a.lastName, a.DOB);
    if (keyA !== null && keyA === identityKey(b.firstName, b.lastName, b.DOB)) return [];
    if (!sameNameTokens(nameTokens(a.firstName, a.lastName), nameTokens(b.firstName, b.lastName))) return [];
    const signals: PossibleDuplicateSignal[] = [];
    const addressA = addressKey(a.address, a.postcode);
    if (addressA !== null && addressA === addressKey(b.address, b.postcode)) signals.push('address');
    const bankA = bankKey(a.bankBsb, a.bankAccount);
    if (bankA !== null && bankA === bankKey(b.bankBsb, b.bankAccount)) signals.push('bank');
    return signals;
};

/* ------------------------------------------------------------------ */
/* Result types and messages                                           */
/* ------------------------------------------------------------------ */

export type TeacherConflictKind = 'EMAIL' | 'NAME_DOB' | 'LOGIN_EMAIL';

/** A BLOCKING conflict. `teacherId` is null when the conflicting login is not linked to a teacher. */
export type TeacherConflict = { kind: TeacherConflictKind; teacherId: number | null; status: string };

export type AdminWarningCode = 'SHARED_PHONE' | 'POSSIBLE_DUPLICATE' | 'SHARED_STUDENT_EMAIL' | 'STUDENT_LOGIN_ON_EMAIL' | 'LOGIN_EMAIL_MISMATCH';

/** A NON-BLOCKING note for administrators. Contains ids and counts only, never personal values. */
export type AdminWarning = { code: AdminWarningCode; message: string; teacherIds?: number[]; studentIds?: number[] };

export const teacherStatusLabel = (role: string, isActive: boolean): string => (role === 'APPLICANT' ? 'pending applicant' : isActive ? 'active teacher' : 'inactive teacher');

/** Generic public messages: they never say which record matched or what it contains. */
export const PUBLIC_EMAIL_CONFLICT_MESSAGE = 'This email is already registered. Please use a different email.';
export const PUBLIC_IDENTITY_CONFLICT_MESSAGE = 'A teacher with these details already exists. Please contact the school office.';

/** WWC (Working With Children Check) card numbers are unique per teacher; reusing one is its own problem, not an email problem. */
export const PUBLIC_WWC_CONFLICT_MESSAGE = 'This Working With Children Check number is already registered. Please check the number you entered, or contact the school office.';

export type UniqueViolationKind = 'EMAIL' | 'WWC' | 'OTHER';

/**
 * Which unique rule a database unique-violation (Prisma P2002) broke. Prisma puts the violated fields in
 * `meta.target` (an array of field names, or an index-name string depending on the driver).
 * Anything that is not clearly the email or the WWC number is 'OTHER' and must NOT be reported as an email problem.
 */
export const classifyUniqueViolation = (error: unknown): UniqueViolationKind => {
    const target = (error as { meta?: { target?: unknown } } | null)?.meta?.target;
    const text = (Array.isArray(target) ? target.join(',') : typeof target === 'string' ? target : '').toLowerCase();
    if (text.includes('childrencheckcardnumber')) return 'WWC';
    if (text.includes('email')) return 'EMAIL';
    return 'OTHER';
};

export const describeConflict = (conflict: TeacherConflict): string => {
    switch (conflict.kind) {
        case 'EMAIL':
            return `This email is already used by Teacher #${conflict.teacherId} (${conflict.status}).`;
        case 'NAME_DOB':
            return `A teacher with the same name and date of birth already exists: Teacher #${conflict.teacherId} (${conflict.status}).`;
        default:
            return `This email is already the login of ${conflict.teacherId !== null ? `Teacher #${conflict.teacherId}` : 'another staff account'} (${conflict.status}).`;
    }
};

/** Message for authorised admins. Names the conflicting teacher ID. Never use for unauthenticated callers. */
export const adminConflictMessage = (conflicts: TeacherConflict[], context: 'approval' | 'edit'): string => {
    const seen = new Set<string>();
    const lines: string[] = [];
    for (const conflict of conflicts) {
        const line = describeConflict(conflict);
        if (!seen.has(line)) {
            seen.add(line);
            lines.push(line);
        }
    }
    return `${lines.join(' ')} ${context === 'approval' ? 'Approval is blocked.' : 'The change was not saved.'}`.trim();
};

/** All teacher or student ids mentioned in a list of warnings (the project targets ES2016, so no flatMap). */
export const collectWarningIds = (warnings: AdminWarning[], key: 'teacherIds' | 'studentIds'): number[] => {
    const ids: number[] = [];
    for (const warning of warnings) {
        for (const id of warning[key] ?? []) ids.push(id);
    }
    return ids;
};

const idList = (ids: number[]): string => ids.map((id) => `#${id}`).join(', ');

export const sharedPhoneWarning = (teacherIds: number[]): AdminWarning => ({
    code: 'SHARED_PHONE',
    teacherIds,
    message: `This phone number is also used by Teacher ${idList(teacherIds)}. Shared phone numbers are allowed.`
});

export const possibleDuplicateWarning = (teacherId: number, signals: PossibleDuplicateSignal[]): AdminWarning => ({
    code: 'POSSIBLE_DUPLICATE',
    teacherIds: [teacherId],
    message: `Possible duplicate of Teacher #${teacherId}: similar name and the ${signals.map((s) => (s === 'bank' ? 'same bank account details' : 'same address')).join(' and ')}. Please verify with the school. Nothing was blocked.`
});

export const sharedStudentEmailWarning = (studentIds: number[], akaalIds: Array<number | null>): AdminWarning => ({
    code: 'SHARED_STUDENT_EMAIL',
    studentIds,
    message:
        `This email is also the contact email of Student ${studentIds.map((id, index) => `#${id}${akaalIds[index] != null ? ` (Akaal ID ${akaalIds[index]})` : ''}`).join(', ')}. ` +
        'Family sharing is allowed, but a login account will not be created automatically for an email shared by a teacher and a student.'
});

export const studentLoginOnEmailWarning = (): AdminWarning => ({
    code: 'STUDENT_LOGIN_ON_EMAIL',
    message: 'A STUDENT login already uses this email. This teacher will not be able to create a teacher login on it until the email is changed.'
});

export const loginEmailMismatchWarning = (): AdminWarning => ({
    code: 'LOGIN_EMAIL_MISMATCH',
    message: "This teacher's login still uses a different email from the new profile email. The login email was not changed; review it before the next password reset."
});
