import { db } from '../../utils/db.server';
import { customError } from '../../utils/customError';
import type { MailSender } from '../../utils/bulkMailer';
import { createBulkMailer } from '../../utils/bulkMailer';
import type { RecipientMode, StudentForMail } from './bulk.email.rules';
import { buildRecipients, mergeFields, validateBulkEmailInput } from './bulk.email.rules';

/**
 * Email to a selected group of students (Scope of Work item 35). Admin only (enforced by the route). One email per address; a record is
 * kept of what was sent, to whom and when, and whether each address was accepted. The record can only say "accepted by the mail
 * server": it cannot know whether the message reached the inbox.
 */
const NAME_SEPARATOR = ' | ';

async function loadStudents(ids: number[]): Promise<StudentForMail[]> {
    const rows = await db.student.findMany({
        where: { id: { in: ids }, role: 'STUDENT', isActive: true },
        select: {
            id: true,
            akaalId: true,
            personalDetails: { select: { firstName: true, lastName: true, email: true } },
            parentsDetails: { select: { parentEmail: true } }
        },
        orderBy: { id: 'asc' }
    });
    return (rows as any[]).map((r) => ({
        id: r.id,
        akaalId: r.akaalId ?? null,
        firstName: r.personalDetails?.firstName ?? '',
        lastName: r.personalDetails?.lastName ?? '',
        studentEmail: r.personalDetails?.email ?? null,
        parentEmail: r.parentsDetails?.parentEmail ?? null
    }));
}

type Input = { studentIds: number[]; mode: RecipientMode; subject: string; message: string; templateId?: number; templateName?: string; filters?: unknown };

/** How many addresses a send would reach, with no email sent. */
export async function previewBulkEmail(input: { studentIds: number[]; mode: RecipientMode }) {
    const errors = validateBulkEmailInput({ studentIds: input.studentIds, mode: input.mode, subject: 'x', message: 'x' });
    if (errors.length) throw customError(errors.join(' '), 'fail', 400, true);
    const students = await loadStudents(input.studentIds);
    const built = buildRecipients(students, input.mode);
    return {
        studentCount: students.length,
        addressCount: built.recipients.length,
        withoutAddress: built.withoutAddress,
        invalidAddresses: built.invalidAddresses,
        sample: built.recipients.slice(0, 5).map((r) => ({ email: r.email, studentNames: r.studentNames }))
    };
}

/**
 * Creates the record and starts sending in the background. Answers at once with the record id: the page then reads the record to
 * show progress. `done` resolves when sending has finished (used by the tests; the route ignores it).
 */
export async function startBulkEmail(input: Input, admin: { id?: number; email: string }, sender: MailSender = createBulkMailer()) {
    const errors = validateBulkEmailInput(input);
    if (errors.length) throw customError(errors.join(' '), 'fail', 400, true);
    const subject = input.subject.trim();
    const message = input.message.trim();

    const students = await loadStudents(input.studentIds);
    const built = buildRecipients(students, input.mode);
    if (built.recipients.length === 0) throw customError('None of the selected students has an email address for this choice.', 'fail', 400, true);

    const record = await db.bulkEmail.create({
        data: {
            sentByUserId: admin.id ?? null,
            sentByEmail: admin.email,
            subject,
            message,
            templateId: input.templateId ?? null,
            templateName: input.templateName ?? null,
            recipientMode: input.mode,
            filters: (input.filters as any) ?? undefined,
            studentCount: students.length,
            recipientCount: built.recipients.length,
            skippedStudents: built.withoutAddress.length,
            status: 'SENDING'
        }
    });
    await db.bulkEmailRecipient.createMany({
        data: built.recipients.map((r) => ({ bulkEmailId: record.id, email: r.email, studentIds: r.studentIds, studentNames: r.studentNames.join(NAME_SEPARATOR) }))
    });

    const done = runBulkSend(record.id, subject, message, sender).catch(() => undefined);
    return { id: record.id, recipientCount: built.recipients.length, skippedStudents: built.withoutAddress.length, done };
}

/**
 * Sends ONE copy of the email to the admin's own address, so they can see exactly what parents will get before the real send. The
 * subject starts with "[TEST]". The names come from the first selected students (or a stand-in). It is not a group send, so no record is
 * kept and nobody else is emailed.
 */
export async function sendTestBulkEmail(input: { studentIds?: number[]; subject: string; message: string }, adminEmail: string, sender: MailSender = createBulkMailer()) {
    const ids = Array.isArray(input.studentIds) && input.studentIds.length > 0 ? input.studentIds : [1];
    const errors = validateBulkEmailInput({ studentIds: ids, mode: 'BOTH', subject: input.subject, message: input.message });
    if (errors.length) {
        sender.close();
        throw customError(errors.join(' '), 'fail', 400, true);
    }
    if (!adminEmail || !adminEmail.includes('@')) {
        sender.close();
        throw customError('Your account has no email address to send the test to.', 'fail', 400, true);
    }
    try {
        const students = input.studentIds && input.studentIds.length > 0 ? await loadStudents(input.studentIds.slice(0, 3)) : [];
        const names = students.length > 0 ? students.map((s) => `${s.firstName} ${s.lastName}`.trim()) : ['Student Name'];
        const result = await sender.send({ to: adminEmail, subject: `[TEST] ${mergeFields(input.subject.trim(), names)}`, text: mergeFields(input.message.trim(), names) });
        if (!result.ok) throw customError(`The test email could not be sent: ${result.error ?? 'the mail server did not accept it'}`, 'fail', 502, true);
        return { sentTo: adminEmail };
    } finally {
        sender.close();
    }
}

export async function runBulkSend(bulkEmailId: number, subject: string, message: string, sender: MailSender) {
    let sent = 0;
    let failed = 0;
    try {
        const recipients = await db.bulkEmailRecipient.findMany({ where: { bulkEmailId, status: 'PENDING' }, orderBy: { id: 'asc' } });
        for (const recipient of recipients) {
            const names = recipient.studentNames.split(NAME_SEPARATOR);
            const result = await sender.send({ to: recipient.email, subject: mergeFields(subject, names), text: mergeFields(message, names) });
            await db.bulkEmailRecipient.update({
                where: { id: recipient.id },
                data: result.ok ? { status: 'SENT', sentAt: new Date() } : { status: 'FAILED', error: result.error ?? 'Send failed' }
            });
            if (result.ok) sent++;
            else failed++;
            if ((sent + failed) % 10 === 0) await db.bulkEmail.update({ where: { id: bulkEmailId }, data: { sentCount: sent, failedCount: failed } });
        }
        await db.bulkEmail.update({ where: { id: bulkEmailId }, data: { sentCount: sent, failedCount: failed, status: 'DONE', finishedAt: new Date() } });
    } catch (error) {
        console.error('Bulk email stopped:', error instanceof Error ? error.message : error);
        try {
            await db.bulkEmail.update({ where: { id: bulkEmailId }, data: { sentCount: sent, failedCount: failed, status: 'FAILED', finishedAt: new Date() } });
        } catch {
            // the record could not be updated either
        }
    } finally {
        sender.close();
    }
}

const STALE_AFTER_MS = 60 * 60 * 1000;
/** A send still marked SENDING an hour later was cut off (for example by a restart): show it as INTERRUPTED. */
const shownStatus = (status: string, createdAt: Date, now: number) => (status === 'SENDING' && now - new Date(createdAt).getTime() > STALE_AFTER_MS ? 'INTERRUPTED' : status);

export async function listBulkEmails(now: number = Date.now()) {
    const rows = await db.bulkEmail.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    return rows.map((r: any) => ({ ...r, status: shownStatus(r.status, r.createdAt, now) }));
}

export async function getBulkEmail(id: number, now: number = Date.now()) {
    const record = await db.bulkEmail.findUnique({ where: { id }, include: { recipients: { orderBy: { id: 'asc' } } } });
    if (!record) throw customError('That sent email was not found.', 'fail', 404, true);
    const recipients = record.recipients.map((r: any) => ({ ...r, studentNames: r.studentNames.split(NAME_SEPARATOR) }));
    return {
        ...record,
        recipients,
        // counts read from the rows, so progress is right while the send is still running
        sentCount: recipients.filter((r: any) => r.status === 'SENT').length,
        failedCount: recipients.filter((r: any) => r.status === 'FAILED').length,
        pendingCount: recipients.filter((r: any) => r.status === 'PENDING').length,
        status: shownStatus(record.status, record.createdAt, now)
    };
}
