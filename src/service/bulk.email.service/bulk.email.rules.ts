/**
 * Bulk email rules (Scope of Work item 35, "E1"). Pure and import-free so they can be unit-tested without a database or a mail server.
 *
 * An admin picks students on the student list and sends one email. The email goes to ONE message per address, not one per child:
 * a parent with three children among the selected students gets a single email that names all three. The admin chooses where it goes:
 *   STUDENT  the student's own email address (the one the account uses)
 *   PARENT   the parent's second email address (ParentsDetails.parentEmail)
 *   BOTH     both of them
 */
export type RecipientMode = 'STUDENT' | 'PARENT' | 'BOTH';
export const RECIPIENT_MODES: readonly RecipientMode[] = ['STUDENT', 'PARENT', 'BOTH'];
export const MAX_STUDENTS = 2000;
export const MAX_SUBJECT = 200;
export const MAX_MESSAGE = 20000;
/** The only merge field. The amount due is deliberately not merged: the email tells parents to check it in the app. */
export const ALLOWED_PLACEHOLDERS = ['student_names'] as const;

export type StudentForMail = { id: number; akaalId: number | null; firstName: string; lastName: string; studentEmail: string | null; parentEmail: string | null };
export type Recipient = { email: string; studentIds: number[]; studentNames: string[] };
export type StudentWithoutAddress = { studentId: number; akaalId: number | null; name: string };

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const clean = (value: string | null | undefined) => (value ?? '').trim().toLowerCase();
const fullName = (s: StudentForMail) => `${s.firstName} ${s.lastName}`.trim();

export function buildRecipients(students: readonly StudentForMail[], mode: RecipientMode) {
    const byAddress = new Map<string, Recipient>();
    const withoutAddress: StudentWithoutAddress[] = [];
    const invalidAddresses: string[] = [];

    for (const student of students) {
        const wanted: (string | null)[] = mode === 'STUDENT' ? [student.studentEmail] : mode === 'PARENT' ? [student.parentEmail] : [student.studentEmail, student.parentEmail];
        const valid = new Set<string>();
        for (const raw of wanted) {
            const address = clean(raw);
            if (!address) continue;
            if (EMAIL_RE.test(address)) valid.add(address);
            else invalidAddresses.push(address);
        }
        if (valid.size === 0) {
            withoutAddress.push({ studentId: student.id, akaalId: student.akaalId, name: fullName(student) });
            continue;
        }
        for (const address of valid) {
            const entry = byAddress.get(address) ?? { email: address, studentIds: [], studentNames: [] };
            if (!entry.studentIds.includes(student.id)) {
                entry.studentIds.push(student.id);
                entry.studentNames.push(fullName(student));
            }
            byAddress.set(address, entry);
        }
    }
    return { recipients: [...byAddress.values()], withoutAddress, invalidAddresses };
}

/** "A", "A and B", "A, B and C". */
export function joinNames(names: readonly string[]): string {
    if (names.length <= 1) return names[0] ?? '';
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function findUnknownPlaceholders(text: string): string[] {
    const unknown = new Set<string>();
    for (const match of text.matchAll(PLACEHOLDER)) {
        if (!(ALLOWED_PLACEHOLDERS as readonly string[]).includes(match[1].toLowerCase())) unknown.add(match[0]);
    }
    return [...unknown];
}

export function mergeFields(text: string, studentNames: readonly string[]): string {
    return text.replace(PLACEHOLDER, (whole, name: string) => (name.toLowerCase() === 'student_names' ? joinNames(studentNames) : whole));
}

export function validateBulkEmailInput(input: { studentIds: unknown; mode: unknown; subject: unknown; message: unknown }): string[] {
    const errors: string[] = [];
    const ids = input.studentIds;
    if (!Array.isArray(ids) || ids.length === 0) errors.push('Select at least one student.');
    else if (ids.length > MAX_STUDENTS) errors.push(`Select at most ${MAX_STUDENTS} students at a time.`);
    else if (!ids.every((id) => Number.isInteger(id) && id > 0)) errors.push('The student list is not valid.');
    if (typeof input.mode !== 'string' || !(RECIPIENT_MODES as readonly string[]).includes(input.mode)) errors.push('Choose where the email goes: the student email, the parent email, or both.');
    const subject = typeof input.subject === 'string' ? input.subject.trim() : '';
    const message = typeof input.message === 'string' ? input.message.trim() : '';
    if (!subject) errors.push('The subject is required.');
    else if (subject.length > MAX_SUBJECT) errors.push(`The subject must be at most ${MAX_SUBJECT} characters.`);
    if (!message) errors.push('The message is required.');
    else if (message.length > MAX_MESSAGE) errors.push(`The message must be at most ${MAX_MESSAGE} characters.`);
    const unknown = [...findUnknownPlaceholders(subject), ...findUnknownPlaceholders(message)];
    if (unknown.length) errors.push(`Unknown merge field: ${[...new Set(unknown)].join(', ')}. Only {{student_names}} can be used.`);
    return errors;
}
