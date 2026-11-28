/**
 * Direct debit emails (Administration > Direct Debit > Emails). Every email direct debit sends has a built-in default
 * subject + body here; the office can change the wording (or switch an email off) and that override is stored in
 * DirectDebitEmailTemplate. Placeholders like {{amount}} are filled in when the email is sent. Emails are plain text.
 */
import { db } from '../../utils/db.server';
import { customError } from '../../utils/customError';
import { sendEmail } from '../../utils/email';

export type EmailVars = Record<string, string | number | null | undefined>;

type TemplateDef = {
    key: string;
    audience: 'PARENT' | 'OFFICE';
    name: string;
    when: string;
    placeholders: Record<string, string>;
    subject: string;
    body: string;
    /** Values for the preview / test email. */
    sample: EmailVars;
};

const COMMON = { schoolName: 'School name (Akaal Shaouni)' };

const SAMPLE_LINES = '- Jasminder Singh: 26.12 Kirtan December 2026, $50 (due 12 Dec 2026), debited on 14 Dec 2026';

export const DIRECT_DEBIT_EMAILS: TemplateDef[] = [
    {
        key: 'SETUP_CONFIRMED',
        audience: 'PARENT',
        name: 'Direct debit set up',
        when: 'Sent to the parent when their bank details are confirmed (first setup or bank change).',
        placeholders: {
            ...COMMON,
            studentNames: 'Children covered by this login',
            bsb: 'BSB',
            bankLast4: 'Last 4 digits of the account',
            schedule: 'When invoices are debited, e.g. "on their due date" or "every Monday"',
            reminderText: 'Sentence about reminder emails (empty when reminders are off)',
            agreementLink: 'Link to the Direct Debit Request service agreement (may be empty)',
            balanceText: 'Sentence about the balance debited at setup (empty when not chosen)'
        },
        subject: '{{schoolName}}: direct debit is set up',
        body:
            'Direct debit is now active for school fees ({{studentNames}}), from the bank account BSB {{bsb}} ending {{bankLast4}}.\n\n' +
            'Invoices will be debited {{schedule}}.{{reminderText}}\n\n' +
            '{{balanceText}}\n\n' +
            'Your Direct Debit Request service agreement: {{agreementLink}}\n\n' +
            'You can cancel at any time from the Fees page.\n\n{{schoolName}}',
        sample: {
            studentNames: 'Jasminder Singh',
            bsb: '000000',
            bankLast4: '3456',
            schedule: 'on their due date',
            reminderText: ' We will email you 3 day(s) before each debit.',
            agreementLink: 'https://payments.stripe.com/...',
            balanceText: 'As requested, we have also started a debit of $150 for 3 invoice(s) already due. It takes 2-4 business days to clear.'
        }
    },
    {
        key: 'REMINDER',
        audience: 'PARENT',
        name: 'Upcoming debit reminder',
        when: 'Sent to the parent before each debit day (days set on the Settings tab).',
        placeholders: { ...COMMON, bankLast4: 'Last 4 digits of the account', invoiceLines: 'One line per invoice: student, invoice, amount, due date, debit date', total: 'Total to be debited' },
        subject: '{{schoolName}}: upcoming school fees direct debit',
        body:
            'This is a reminder that the following will be debited from your bank account ending {{bankLast4}}:\n\n{{invoiceLines}}\n\n' +
            'Total: {{total}}. Please make sure funds are available. You can cancel direct debit at any time from the Fees page.\n\n{{schoolName}}',
        sample: { bankLast4: '3456', invoiceLines: SAMPLE_LINES, total: '$50' }
    },
    {
        key: 'DEBIT_STARTED',
        audience: 'PARENT',
        name: 'Debit started',
        when: 'Sent to the parent when the debit run takes money for their invoices.',
        placeholders: { ...COMMON, amount: 'Total being debited', bankLast4: 'Last 4 digits of the account', invoiceCount: 'Number of invoices', invoiceLines: 'One line per invoice' },
        subject: '{{schoolName}}: school fees direct debit started',
        body:
            'We have started a direct debit of {{amount}} from your bank account ending {{bankLast4}} for {{invoiceCount}} invoice(s):\n\n{{invoiceLines}}\n\n' +
            'Bank transfers take 2-4 business days to clear; the invoices show "Direct debit processing" until then.\n\n{{schoolName}}',
        sample: { amount: '$50', bankLast4: '3456', invoiceCount: 1, invoiceLines: '- Jasminder Singh: 26.12 Kirtan December 2026, $50' }
    },
    {
        key: 'DEBIT_FAILED',
        audience: 'PARENT',
        name: 'Debit unsuccessful',
        when: 'Sent to the parent when a debit fails. It is not retried.',
        placeholders: { ...COMMON, amount: 'Amount', studentName: 'Student', invoiceName: 'Invoice name', invoiceNumber: 'Invoice number', failureReason: 'Reason from the bank' },
        subject: '{{schoolName}}: direct debit unsuccessful',
        body:
            'The direct debit of {{amount}} for {{studentName}} ({{invoiceName}}) was unsuccessful: {{failureReason}}.\n\n' +
            'Please pay this invoice from the Fees page or at the school office.\n\n{{schoolName}}',
        sample: { amount: '$50', studentName: 'Jasminder Singh', invoiceName: '26.12 Kirtan December 2026', invoiceNumber: '56911012', failureReason: 'insufficient funds' }
    },
    {
        key: 'CANCELLED',
        audience: 'PARENT',
        name: 'Direct debit cancelled',
        when: 'Sent to the parent when they or the office cancel direct debit.',
        placeholders: { ...COMMON, cancelledBy: '"you" or "the school office"', bankLast4: 'Last 4 digits of the account' },
        subject: '{{schoolName}}: direct debit cancelled',
        body:
            'Direct debit for school fees from your account ending {{bankLast4}} has been cancelled by {{cancelledBy}}. Future invoices will not be debited.\n\n' +
            'Please pay invoices from the Fees page or at the school office. You can set up direct debit again at any time.\n\n{{schoolName}}',
        sample: { cancelledBy: 'you', bankLast4: '3456' }
    },
    {
        key: 'STOPPED_BY_BANK',
        audience: 'PARENT',
        name: 'Direct debit stopped by the bank',
        when: 'Sent to the parent when their bank or Stripe deactivates the direct debit (e.g. account closed).',
        placeholders: { ...COMMON, bankLast4: 'Last 4 digits of the account' },
        subject: '{{schoolName}}: direct debit stopped',
        body:
            'Your direct debit for school fees (account ending {{bankLast4}}) is no longer active: the bank or Stripe deactivated it.\n\n' +
            'Please pay invoices from the Fees page, or set up direct debit again with another account.\n\n{{schoolName}}',
        sample: { bankLast4: '3456' }
    },
    {
        key: 'OFFICE_DEBIT_FAILED',
        audience: 'OFFICE',
        name: 'Office: debit failed',
        when: 'Sent to the office email when a debit fails.',
        placeholders: { ...COMMON, amount: 'Amount', studentName: 'Student', akaalId: 'Akaal ID', invoiceNumber: 'Invoice number', familyEmail: 'Family login', failureReason: 'Reason from the bank' },
        subject: '[Direct debit] Debit failed: {{studentName}} {{amount}}',
        body: 'Direct debit of {{amount}} for {{studentName}} (Akaal ID {{akaalId}}), invoice {{invoiceNumber}}, family {{familyEmail}}, failed: {{failureReason}}.\n\nIt is not retried. It is listed on the admin dashboard until marked as dealt with.',
        sample: { amount: '$50', studentName: 'Jasminder Singh', akaalId: 5691, invoiceNumber: '56911012', familyEmail: 'parent@example.com', failureReason: 'insufficient funds' }
    },
    {
        key: 'OFFICE_DISPUTE',
        audience: 'OFFICE',
        name: 'Office: debit disputed',
        when: 'Sent to the office email when a family disputes a debit with their bank.',
        placeholders: { ...COMMON, amount: 'Amount', studentName: 'Student', invoiceNumber: 'Invoice number', familyEmail: 'Family login' },
        subject: '[Direct debit] Debit disputed: {{familyEmail}} {{amount}}',
        body:
            'The family {{familyEmail}} disputed the direct debit of {{amount}} for {{studentName}} (invoice {{invoiceNumber}}).\n\n' +
            'Stripe will return the money to them; the invoice still shows as paid in the school system until the office corrects it. Check the Stripe dashboard.',
        sample: { amount: '$50', studentName: 'Jasminder Singh', invoiceNumber: '56911012', familyEmail: 'parent@example.com' }
    },
    {
        key: 'OFFICE_MANDATE_DEACTIVATED',
        audience: 'OFFICE',
        name: 'Office: direct debit stopped by the bank',
        when: "Sent to the office email when a family's direct debit is deactivated by the bank or Stripe.",
        placeholders: { ...COMMON, familyEmail: 'Family login', bankLast4: 'Last 4 digits of the account' },
        subject: '[Direct debit] Stopped by the bank: {{familyEmail}}',
        body: 'The direct debit for {{familyEmail}} (account ending {{bankLast4}}) was deactivated by the bank or Stripe. Future invoices will not be debited.',
        sample: { familyEmail: 'parent@example.com', bankLast4: '3456' }
    },
    {
        key: 'OFFICE_CREDIT_SKIPPED',
        audience: 'OFFICE',
        name: 'Office: skipped, student has credit',
        when: 'Sent to the office email when a student on direct debit has invoices due but holds credit (not debited).',
        placeholders: { ...COMMON, familyEmail: 'Family login', studentLines: 'One line per student with their credit' },
        subject: '[Direct debit] Skipped, student has credit: {{familyEmail}}',
        body:
            'These students are on direct debit ({{familyEmail}}) and have invoices due, but they hold credit. ' +
            'The direct debit did not run for them; please apply the credit or settle the invoice manually.\n\n{{studentLines}}',
        sample: { familyEmail: 'parent@example.com', studentLines: '- Jasminder Singh (Akaal ID 5691): credit $20' }
    }
];

const byKey = new Map(DIRECT_DEBIT_EMAILS.map((t) => [t.key, t]));

function definition(key: string): TemplateDef {
    const def = byKey.get(key);
    if (!def) throw customError('Unknown direct debit email', 'fail', 404, true);
    return def;
}

/** Fills {{placeholders}}; unknown or empty ones become blank, then 3+ blank lines are squeezed to one. */
export function renderTemplate(text: string, vars: EmailVars): string {
    const all: EmailVars = { schoolName: 'Akaal Shaouni', ...vars };
    return text
        .replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => (all[k] === null || all[k] === undefined ? '' : String(all[k])))
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

async function effective(key: string) {
    const def = definition(key);
    const row = await db.directDebitEmailTemplate.findUnique({ where: { key } });
    return { def, subject: row?.subject ?? def.subject, body: row?.body ?? def.body, enabled: row?.enabled ?? true, row };
}

/** Sends one direct debit email using the office's wording (or the default). Returns false when switched off / not sent. */
export async function sendDirectDebitEmail(key: string, to: string | undefined | null, vars: EmailVars): Promise<boolean> {
    if (!to) {
        console.log('[direct-debit] no address for email', key);
        return false;
    }
    const t = await effective(key);
    if (!t.enabled) {
        console.log('[direct-debit] email switched off:', key);
        return false;
    }
    const sent = await sendEmail({ email: to, subject: renderTemplate(t.subject, vars).replace(/\s+/g, ' '), text: renderTemplate(t.body, vars) });
    return !!sent;
}

// ---------- admin ----------

export async function listDirectDebitEmails() {
    const rows = await db.directDebitEmailTemplate.findMany();
    const saved = new Map(rows.map((r) => [r.key, r]));
    return DIRECT_DEBIT_EMAILS.map((d) => {
        const r = saved.get(d.key);
        return {
            key: d.key,
            audience: d.audience,
            name: d.name,
            when: d.when,
            placeholders: d.placeholders,
            subject: r?.subject ?? d.subject,
            body: r?.body ?? d.body,
            enabled: r?.enabled ?? true,
            customised: !!r && (r.subject !== d.subject || r.body !== d.body),
            defaultSubject: d.subject,
            defaultBody: d.body,
            updatedAt: r?.updatedAt ?? null,
            updatedBy: r?.updatedBy ?? null
        };
    });
}

export async function saveDirectDebitEmail(key: string, input: { subject: string; body: string; enabled: boolean }, adminEmail: string) {
    definition(key);
    const subject = input.subject.trim();
    const body = input.body.trim();
    if (!subject || !body) throw customError('Subject and body cannot be empty.', 'fail', 400, true);
    await db.directDebitEmailTemplate.upsert({
        where: { key },
        update: { subject, body, enabled: input.enabled, updatedBy: adminEmail },
        create: { key, subject, body, enabled: input.enabled, updatedBy: adminEmail }
    });
    return listDirectDebitEmails();
}

/** Back to the built-in wording (and switched on). */
export async function resetDirectDebitEmail(key: string) {
    definition(key);
    await db.directDebitEmailTemplate.deleteMany({ where: { key } });
    return listDirectDebitEmails();
}

/** Preview with sample values; uses the text being edited when given, so the office sees changes before saving. */
export function previewDirectDebitEmail(key: string, draft?: { subject?: string; body?: string }) {
    const def = definition(key);
    return {
        subject: renderTemplate(draft?.subject ?? def.subject, def.sample).replace(/\s+/g, ' '),
        body: renderTemplate(draft?.body ?? def.body, def.sample)
    };
}

/** Sends the preview (sample values) to the admin's own email. */
export async function sendTestDirectDebitEmail(key: string, adminEmail: string, draft?: { subject?: string; body?: string }) {
    const p = previewDirectDebitEmail(key, draft);
    const sent = await sendEmail({ email: adminEmail, subject: `[TEST] ${p.subject}`, text: p.body });
    if (!sent) throw customError('The test email could not be sent.', 'fail', 500, true);
    return { sentTo: adminEmail };
}
