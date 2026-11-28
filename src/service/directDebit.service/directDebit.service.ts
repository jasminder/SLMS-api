/**
 * BECS Direct Debit (Stripe) for school fees.
 *
 * Design (agreed 2026-11-16, built 2026-11-23):
 * - One mandate per family LOGIN. Siblings share the login email (personalDetails.email), so one mandate pays them all.
 * - Bank details are collected on a Stripe-hosted Checkout page (mode "setup", au_becs_debit). Stripe shows the DDR
 *   service agreement; only the BSB and last 4 digits are stored here.
 * - No Stripe Subscriptions: the daily job debits the EXISTING invoices on their due date, one PaymentIntent per invoice.
 * - Which invoices: those falling due on/after the day the mandate became active. At setup the parent may also opt to
 *   pay the balance already due (invoices due before that day): one debit per invoice straight away.
 * - A debit takes 2-4 business days to clear. While it does, FeePayment.directDebitInFlight blocks card payment,
 *   office payment and the overdue job, so the invoice cannot be paid twice.
 * - A failed debit is NOT retried automatically: the parent and the office are emailed and it shows on the admin
 *   dashboard; the invoice is then paid by card or at the office as before.
 * - Only invoices of ACTIVE students are debited, and a student holding credit is skipped (credit is applied by the
 *   office only, see docs/gotchas.md) and reported to the office instead.
 */
import Stripe from 'stripe';
import { DirectDebitChargeReason, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { db } from '../../utils/db.server';
import { customError } from '../../utils/customError';
import { sendDirectDebitEmail } from './directDebitEmails.service';
import { allowedEmails, describeSchedule, getDirectDebitSettings, isFamilyAllowed, nextRunOnOrAfter, recordRunSummary } from './directDebitSettings.service';

export const DIRECT_DEBIT_RECEIVED_BY = 'Direct debit (BECS) - Stripe';
const PURPOSE_SETUP = 'becs_setup';
const PURPOSE_DEBIT = 'becs_debit';
/** Webhook DB updates run several queries in one transaction; Prisma's 5 s default is too tight when the DB is slow or remote. */
const TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 };

// ---------- helpers ----------

/**
 * Direct debit can run on its own Stripe key (STRIPE_BECS_SECRET_KEY, e.g. a test key) while card payments keep using
 * STRIPE_SECRET_KEY (live). Leave STRIPE_BECS_SECRET_KEY unset to run direct debit on the main key.
 */
function stripeClient(): Stripe {
    const raw = (process.env.STRIPE_BECS_SECRET_KEY || process.env.STRIPE_SECRET_KEY || '').trim().replace(/^['"]|['"]$/g, '');
    if (!raw.startsWith('sk_') && !raw.startsWith('rk_')) {
        throw customError('Stripe is not configured on the server (STRIPE_BECS_SECRET_KEY / STRIPE_SECRET_KEY).', 'fail', 500, true);
    }
    return new Stripe(raw);
}

/** Which Stripe mode direct debit runs in (from the key prefix only; the key itself is never returned). */
export function directDebitStripeMode() {
    const separateKey = !!process.env.STRIPE_BECS_SECRET_KEY;
    const raw = (process.env.STRIPE_BECS_SECRET_KEY || process.env.STRIPE_SECRET_KEY || '').trim().replace(/^['"]|['"]$/g, '');
    const mode = /^(sk|rk)_live_/.test(raw) ? 'LIVE' : /^(sk|rk)_test_/.test(raw) ? 'TEST' : 'NOT_CONFIGURED';
    return { mode: mode as 'LIVE' | 'TEST' | 'NOT_CONFIGURED', separateKey, webhookSecretSet: !!(separateKey ? process.env.STRIPE_BECS_WEBHOOK_SECRET : process.env.STRIPE_WEBHOOK_SECRET) };
}

/** Verifies a webhook sent to the direct-debit-only endpoint (signed with STRIPE_BECS_WEBHOOK_SECRET). */
export function constructDirectDebitWebhookEvent(body: Buffer, signature: string): Stripe.Event {
    const secret = process.env.STRIPE_BECS_WEBHOOK_SECRET;
    if (!secret) throw customError('STRIPE_BECS_WEBHOOK_SECRET is not set.', 'fail', 500, true);
    return stripeClient().webhooks.constructEvent(body, signature, secret);
}

/** Office alert address: Administration > Direct Debit setting, else OFFICE_EMAIL / EMAIL_FROM from the env. */
async function officeEmail(): Promise<string | undefined> {
    const s = await getDirectDebitSettings();
    return s.officeEmail || process.env.OFFICE_EMAIL || process.env.EMAIL_FROM || undefined;
}

/** Active mandates the current settings allow to be debited (switched on + family allowed). */
async function debitableMandates() {
    const settings = await getDirectDebitSettings();
    const allowed = await allowedEmails(settings);
    const mandates = await db.directDebitMandate.findMany({ where: { status: 'ACTIVE', stripeMandateId: { not: null } } });
    return { settings, mandates: allowed === null ? mandates : mandates.filter((m) => allowed.has(m.email.trim().toLowerCase())) };
}

function webBaseUrl(): string {
    return (process.env.CLIENT_URL || 'https://akaalshaouni.org').replace(/\/+$/, '');
}

/**
 * Where Stripe sends the parent back to on the web: the page they started from (so ?studentId= is kept, and localhost
 * stays on localhost), but only if it is one of our own web hosts. Anything else falls back to the fee list on CLIENT_URL.
 */
function webReturnUrl(returnUrl: string | undefined, status: 'success' | 'cancelled'): string {
    const allowedOrigins = new Set([webBaseUrl(), 'https://akaalshaouni.org', 'https://www.akaalshaouni.org', 'https://akaal.wspclients.com']);
    try {
        if (returnUrl) {
            const url = new URL(returnUrl);
            const local = url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
            if (allowedOrigins.has(url.origin) || local) {
                url.searchParams.set('directDebit', status);
                url.hash = '';
                return url.toString();
            }
        }
    } catch {
        // not a URL: use the default below
    }
    return `${webBaseUrl()}/student/fee-list?directDebit=${status}`;
}

/** Midnight today in the process timezone (production runs on Australia/Sydney). */
function startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfDayInDays(days: number): Date {
    const d = startOfToday();
    d.setDate(d.getDate() + days);
    d.setHours(23, 59, 59, 999);
    return d;
}

const money = (n: number) => `$${n.toLocaleString('en-AU')}`;
const fmtDate = (d: Date) => d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

function log(...args: unknown[]) {
    console.log('[direct-debit]', ...args);
}

/** Students covered by a family login (same rule as the app's student switcher). Active students only. */
async function familyStudents(email: string) {
    return db.student.findMany({
        where: {
            personalDetails: { email: { equals: email.trim(), mode: 'insensitive' } },
            role: 'STUDENT',
            isActive: true
        },
        select: {
            id: true,
            akaalId: true,
            creditBalance: true,
            personalDetails: { select: { firstName: true, lastName: true } }
        }
    });
}

const studentName = (s: { personalDetails: { firstName: string; lastName: string } | null } | null | undefined) =>
    s?.personalDetails ? `${s.personalDetails.firstName} ${s.personalDetails.lastName}`.trim() : 'Student';

/** Unpaid invoices of the given students that a debit could cover. */
function unpaidInvoiceWhere(studentIds: number[]): Prisma.FeePaymentWhereInput {
    return {
        studentTermFee: { studentId: { in: studentIds } },
        dueAmount: { gt: 0 },
        status: { not: PaymentStatus.PAID },
        directDebitInFlight: false
    };
}

// ---------- parent: status / setup / cancel ----------

export async function getMandateForUser(userId: number) {
    const mandate = await db.directDebitMandate.findUnique({ where: { userId } });
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
    const settings = await getDirectDebitSettings();
    const canSetUp = !!user && (await isFamilyAllowed(user.email, settings));
    // A family that already has direct debit always sees it (status + Cancel), even when the school has switched it off.
    // Otherwise, not offered to this family (switched off / not on the list): 403 so the web panel and the app hide it.
    const hasLiveMandate = !!mandate && (mandate.status === 'ACTIVE' || mandate.status === 'PAUSED');
    if (!canSetUp && !hasLiveMandate) {
        throw customError('Direct debit is not available for this family.', 'fail', 403, true);
    }
    const students = user ? await familyStudents(user.email) : [];
    const studentIds = students.map((s) => s.id);
    const processing = studentIds.length
        ? await db.feePayment.findMany({
              where: { studentTermFee: { studentId: { in: studentIds } }, directDebitInFlight: true },
              select: { id: true, dueAmount: true }
          })
        : [];
    return {
        mandate: mandate
            ? {
                  status: mandate.status,
                  bsbNumber: mandate.bsbNumber,
                  bankLast4: mandate.bankLast4,
                  mandateUrl: mandate.mandateUrl,
                  activatedAt: mandate.activatedAt,
                  cancelledAt: mandate.cancelledAt,
                  statusReason: mandate.statusReason
              }
            : null,
        students: students.map((s) => ({ id: s.id, name: studentName(s) })),
        canSetUp,
        /** false = set up, but the school has switched direct debit off (or removed this family): nothing is debited. */
        debitsRunning: canSetUp,
        allowPayExistingBalance: settings.allowPayExistingBalance,
        reminderDaysBefore: settings.reminderDaysBefore,
        /** e.g. "every Monday": invoices are debited at the first run on or after their due date. */
        schedule: describeSchedule(settings),
        processingCount: processing.length,
        processingAmount: processing.reduce((sum, f) => sum + f.dueAmount, 0)
    };
}

/** Creates (or reuses) the Stripe customer and returns a Stripe-hosted setup page URL. */
export async function createSetupSession(userId: number, payExistingBalance: boolean, returnTo: 'web' | 'app' = 'web', returnUrl?: string) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } });
    if (!user || user.role !== 'STUDENT') {
        throw customError('Direct debit can only be set up from a parent/student login.', 'fail', 403, true);
    }
    const settings = await getDirectDebitSettings();
    if (!(await isFamilyAllowed(user.email, settings))) {
        throw customError('Direct debit is not available for this family. Please contact the school office.', 'fail', 403, true);
    }
    if (!settings.allowPayExistingBalance) payExistingBalance = false;
    const students = await familyStudents(user.email);
    if (!students.length) {
        throw customError('No current students are linked to this login.', 'fail', 400, true);
    }

    const stripe = stripeClient();
    let mandate = await db.directDebitMandate.findUnique({ where: { userId } });
    if (mandate?.status === 'ACTIVE') {
        // Replacing the bank account is allowed: the new mandate replaces the old one when setup completes.
        log('setup started over an ACTIVE mandate (bank change) for user', userId);
    }
    if (!mandate) {
        const customer = await stripe.customers.create({
            email: user.email,
            name: students.map(studentName).join(', ').slice(0, 250),
            metadata: { userId: String(user.id), app: 'akaal-shaouni-slms' }
        });
        mandate = await db.directDebitMandate.create({
            data: { userId: user.id, email: user.email, stripeCustomerId: customer.id, status: 'PENDING' }
        });
    }

    const metadata = {
        purpose: PURPOSE_SETUP,
        mandateRowId: String(mandate.id),
        userId: String(user.id),
        payExistingBalance: payExistingBalance ? 'true' : 'false'
    };
    const session = await stripe.checkout.sessions.create({
        mode: 'setup',
        currency: 'aud',
        payment_method_types: ['au_becs_debit'],
        customer: mandate.stripeCustomerId,
        // The app opens this page in the browser, where the parent is not logged in: send them to a public "done" page.
        success_url: returnTo === 'app' ? `${webBaseUrl()}/direct-debit-done?status=success` : webReturnUrl(returnUrl, 'success'),
        cancel_url: returnTo === 'app' ? `${webBaseUrl()}/direct-debit-done?status=cancelled` : webReturnUrl(returnUrl, 'cancelled'),
        metadata,
        setup_intent_data: { metadata }
    });
    return { url: session.url };
}

export async function cancelMandate(mandateId: number, changedBy: string, reason: string) {
    const mandate = await db.directDebitMandate.findUnique({ where: { id: mandateId } });
    if (!mandate) throw customError('Direct debit not found', 'fail', 404, true);
    if (mandate.status === 'CANCELLED') return mandate;
    if (mandate.stripePaymentMethodId) {
        try {
            // Detaching the payment method makes Stripe deactivate the BECS mandate.
            await stripeClient().paymentMethods.detach(mandate.stripePaymentMethodId);
        } catch (e: any) {
            log('detach failed (continuing):', e?.message);
        }
    }
    const updated = await db.directDebitMandate.update({
        where: { id: mandateId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), statusChangedBy: changedBy, statusReason: reason }
    });
    await sendDirectDebitEmail('CANCELLED', mandate.email, {
        bankLast4: mandate.bankLast4,
        cancelledBy: changedBy.toLowerCase() === mandate.email.toLowerCase() ? 'you' : 'the school office'
    });
    return updated;
}

export async function cancelMandateForUser(userId: number, changedBy: string) {
    const mandate = await db.directDebitMandate.findUnique({ where: { userId } });
    if (!mandate) throw customError('No direct debit is set up for this login.', 'fail', 404, true);
    await cancelMandate(mandate.id, changedBy, 'Cancelled by the parent');
    return getMandateForUser(userId);
}

// ---------- admin ----------

/** Mandate of the family a student belongs to (via the student's login email). */
export async function getMandateForStudent(studentId: number) {
    // Every direct debit for THIS student, whichever bank/mandate it came from (kept after a cancellation).
    const charges = await db.directDebitCharge.findMany({ where: { studentId }, orderBy: { createdAt: 'desc' }, take: 50 });
    const invoices = await db.feePayment.findMany({
        where: { id: { in: [...new Set(charges.map((c) => c.feePaymentId))] } },
        select: { id: true, invoiceId: true, feeTemplate: { select: { invoiceName: true } } }
    });
    const invById = new Map(invoices.map((i) => [i.id, i]));
    const studentCharges = charges.map((c) => ({
        id: c.id,
        feePaymentId: c.feePaymentId,
        invoiceNumber: invById.get(c.feePaymentId)?.invoiceId ?? null,
        invoiceName: invById.get(c.feePaymentId)?.feeTemplate?.invoiceName ?? null,
        amount: c.amount,
        reason: c.reason,
        status: c.status,
        disputed: c.disputed,
        failureMessage: c.failureMessage,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
    }));
    const details = await db.personalDetails.findUnique({ where: { studentId }, select: { email: true } });
    if (!details?.email) return { mandate: null, studentCharges };
    const user = await db.user.findFirst({ where: { email: { equals: details.email.trim(), mode: 'insensitive' } }, select: { id: true } });
    if (!user) return { mandate: null, studentCharges };
    const mandate = await db.directDebitMandate.findUnique({
        where: { userId: user.id },
        include: { charges: { orderBy: { createdAt: 'desc' }, take: 10 } }
    });
    return {
        mandate: mandate && {
            id: mandate.id,
            email: mandate.email,
            status: mandate.status,
            bsbNumber: mandate.bsbNumber,
            bankLast4: mandate.bankLast4,
            activatedAt: mandate.activatedAt,
            cancelledAt: mandate.cancelledAt,
            statusChangedBy: mandate.statusChangedBy,
            statusReason: mandate.statusReason,
            recentCharges: mandate.charges.map((c) => ({
                id: c.id,
                feePaymentId: c.feePaymentId,
                studentId: c.studentId,
                amount: c.amount,
                status: c.status,
                disputed: c.disputed,
                failureMessage: c.failureMessage,
                createdAt: c.createdAt
            }))
        },
        studentCharges
    };
}

export async function setMandateStatusByAdmin(mandateId: number, action: 'PAUSE' | 'RESUME' | 'CANCEL', adminEmail: string) {
    const mandate = await db.directDebitMandate.findUnique({ where: { id: mandateId } });
    if (!mandate) throw customError('Direct debit not found', 'fail', 404, true);
    if (action === 'CANCEL') return cancelMandate(mandateId, adminEmail, 'Cancelled by the office');
    if (action === 'PAUSE') {
        if (mandate.status !== 'ACTIVE') throw customError('Only an active direct debit can be paused.', 'fail', 400, true);
        return db.directDebitMandate.update({ where: { id: mandateId }, data: { status: 'PAUSED', statusChangedBy: adminEmail, statusReason: 'Paused by the office' } });
    }
    if (mandate.status !== 'PAUSED') throw customError('Only a paused direct debit can be resumed.', 'fail', 400, true);
    return db.directDebitMandate.update({ where: { id: mandateId }, data: { status: 'ACTIVE', statusChangedBy: adminEmail, statusReason: 'Resumed by the office' } });
}

/** Failed or disputed debits the office has not yet acknowledged (admin dashboard). */
export async function listChargesNeedingAttention() {
    const charges = await db.directDebitCharge.findMany({
        where: { officeAcknowledgedAt: null, OR: [{ status: 'FAILED' }, { disputed: true }] },
        orderBy: { updatedAt: 'desc' },
        include: { mandate: { select: { email: true } } }
    });
    const students = await db.student.findMany({
        where: { id: { in: [...new Set(charges.map((c) => c.studentId))] } },
        select: { id: true, akaalId: true, personalDetails: { select: { firstName: true, lastName: true } } }
    });
    const byId = new Map(students.map((s) => [s.id, s]));
    return charges.map((c) => ({
        id: c.id,
        studentId: c.studentId,
        akaalId: byId.get(c.studentId)?.akaalId ?? null,
        studentName: studentName(byId.get(c.studentId)),
        familyEmail: c.mandate.email,
        amount: c.amount,
        status: c.status,
        disputed: c.disputed,
        failureMessage: c.failureMessage,
        feePaymentId: c.feePaymentId,
        updatedAt: c.updatedAt
    }));
}

export async function acknowledgeCharge(chargeId: number, adminEmail: string) {
    return db.directDebitCharge.update({
        where: { id: chargeId },
        data: { officeAcknowledgedAt: new Date(), officeAcknowledgedBy: adminEmail }
    });
}

// ---------- debiting ----------

type ChargeOutcome = { feePaymentId: number; amount: number; ok: boolean; message?: string; label?: string };

/**
 * Starts one debit for one invoice. Claims the invoice first (directDebitInFlight false -> true in a single
 * conditional update) so two runs, or a card payment racing it, cannot both go ahead.
 */
async function debitInvoice(
    mandate: { id: number; stripeCustomerId: string; stripePaymentMethodId: string | null; stripeMandateId: string | null; email: string },
    invoice: { id: number; dueAmount: number; studentId: number; invoiceName: string },
    reason: DirectDebitChargeReason
): Promise<ChargeOutcome> {
    if (!mandate.stripePaymentMethodId || !mandate.stripeMandateId) {
        return { feePaymentId: invoice.id, amount: invoice.dueAmount, ok: false, message: 'mandate has no bank account' };
    }
    const claimed = await db.feePayment.updateMany({
        where: { id: invoice.id, directDebitInFlight: false, dueAmount: { gt: 0 }, status: { not: PaymentStatus.PAID } },
        data: { directDebitInFlight: true }
    });
    if (claimed.count !== 1) return { feePaymentId: invoice.id, amount: invoice.dueAmount, ok: false, message: 'invoice changed, skipped' };

    const charge = await db.directDebitCharge.create({
        data: { mandateId: mandate.id, feePaymentId: invoice.id, studentId: invoice.studentId, amount: invoice.dueAmount, reason, status: 'PROCESSING' }
    });
    try {
        const intent = await stripeClient().paymentIntents.create(
            {
                amount: Math.round(invoice.dueAmount * 100),
                currency: 'aud',
                customer: mandate.stripeCustomerId,
                payment_method: mandate.stripePaymentMethodId,
                mandate: mandate.stripeMandateId,
                payment_method_types: ['au_becs_debit'],
                confirm: true,
                description: `${invoice.invoiceName} (direct debit)`.slice(0, 200),
                metadata: {
                    purpose: PURPOSE_DEBIT,
                    chargeId: String(charge.id),
                    feePaymentId: String(invoice.id),
                    studentId: String(invoice.studentId)
                }
            },
            { idempotencyKey: `slms-becs-charge-${charge.id}` }
        );
        await db.directDebitCharge.update({ where: { id: charge.id }, data: { stripePaymentIntentId: intent.id } });
        log(`debit started charge=${charge.id} invoice=${invoice.id} $${invoice.dueAmount} intent=${intent.id} status=${intent.status}`);
        return { feePaymentId: invoice.id, amount: invoice.dueAmount, ok: true };
    } catch (e: any) {
        const message = e?.message ?? String(e);
        await markChargeFailed(charge.id, `Could not start the debit: ${message}`);
        return { feePaymentId: invoice.id, amount: invoice.dueAmount, ok: false, message };
    }
}

async function loadInvoicesForDebit(where: Prisma.FeePaymentWhereInput) {
    const rows = await db.feePayment.findMany({
        where,
        orderBy: { dueDate: 'asc' },
        select: {
            id: true,
            dueAmount: true,
            dueDate: true,
            studentTermFee: { select: { studentId: true } },
            feeTemplate: { select: { invoiceName: true } }
        }
    });
    return rows
        .filter((r) => r.studentTermFee?.studentId != null)
        .map((r) => ({
            id: r.id,
            dueAmount: r.dueAmount,
            dueDate: r.dueDate,
            studentId: r.studentTermFee!.studentId,
            invoiceName: r.feeTemplate?.invoiceName ?? `Invoice #${r.id}`
        }));
}

/** Debits for one family, skipping students who hold credit (reported to the office). */
async function debitFamily(
    mandate: { id: number; stripeCustomerId: string; stripePaymentMethodId: string | null; stripeMandateId: string | null; email: string },
    invoiceWhere: (studentIds: number[]) => Prisma.FeePaymentWhereInput,
    reason: DirectDebitChargeReason
) {
    const students = await familyStudents(mandate.email);
    const withCredit = students.filter((s) => s.creditBalance > 0);
    const studentIds = students.filter((s) => s.creditBalance <= 0).map((s) => s.id);
    const outcomes: ChargeOutcome[] = [];
    if (studentIds.length) {
        const invoices = await loadInvoicesForDebit(invoiceWhere(studentIds));
        // Never two debits for the same invoice, even after a failure (no automatic retry).
        const already = await db.directDebitCharge.findMany({ where: { feePaymentId: { in: invoices.map((i) => i.id) } }, select: { feePaymentId: true } });
        const done = new Set(already.map((a) => a.feePaymentId));
        for (const inv of invoices) {
            if (done.has(inv.id)) continue;
            const name = studentName(students.find((st) => st.id === inv.studentId));
            outcomes.push({ ...(await debitInvoice(mandate, inv, reason)), label: `${name}: ${inv.invoiceName}` });
        }
    }
    if (withCredit.length) {
        const owing = await loadInvoicesForDebit(invoiceWhere(withCredit.map((s) => s.id)));
        if (owing.length) {
            const lines = withCredit.map((s) => `- ${studentName(s)} (Akaal ID ${s.akaalId ?? s.id}): credit ${money(s.creditBalance)}`).join('\n');
            await notifyOffice('OFFICE_CREDIT_SKIPPED', { familyEmail: mandate.email, studentLines: lines });
        }
    }
    return outcomes;
}

/** Daily job: debit invoices due today (or earlier, but not before the mandate started) for every active mandate. */
export async function runDailyDirectDebits() {
    const { settings, mandates } = await debitableMandates();
    if (!settings.enabled) {
        log('daily run skipped: direct debit is switched off');
        return { mandates: 0, started: 0, failed: 0 };
    }
    const endToday = endOfDayInDays(0);
    let started = 0;
    let failed = 0;
    for (const m of mandates) {
        const from = startOfDay(m.activatedAt ?? new Date());
        const outcomes = await debitFamily(
            m,
            (ids) => ({ ...unpaidInvoiceWhere(ids), dueDate: { gte: from, lte: endToday } }),
            'SCHEDULED'
        );
        started += outcomes.filter((o) => o.ok).length;
        failed += outcomes.filter((o) => !o.ok).length;
        const okOnes = outcomes.filter((o) => o.ok);
        if (okOnes.length) {
            const total = okOnes.reduce((s, o) => s + o.amount, 0);
            await sendDirectDebitEmail('DEBIT_STARTED', m.email, {
                amount: money(total),
                bankLast4: m.bankLast4,
                invoiceCount: okOnes.length,
                invoiceLines: okOnes.map((o) => `- ${o.label ?? `Invoice #${o.feePaymentId}`}, ${money(o.amount)}`).join('\n')
            });
        }
    }
    log(`daily run: ${mandates.length} active mandate(s), ${started} debit(s) started, ${failed} not started`);
    return { mandates: mandates.length, started, failed };
}

/**
 * Reminder emails, run once a day whatever the debit frequency. Each unpaid invoice is debited at the first run on or
 * after its due date (its "debit day"); the family is emailed when that debit day is within reminderDaysBefore days.
 * One email per family listing those invoices, sent once per invoice.
 */
export async function sendDirectDebitReminders() {
    const { settings, mandates } = await debitableMandates();
    if (!settings.enabled || settings.reminderDaysBefore <= 0) return { emails: 0 };
    const today = startOfToday();
    const msDay = 24 * 60 * 60 * 1000;
    // The debit day is on/after the due date, so only invoices due by the end of the reminder window can qualify.
    const lookAhead = endOfDayInDays(settings.reminderDaysBefore);
    let emails = 0;
    for (const m of mandates) {
        const students = await familyStudents(m.email);
        const ids = students.filter((s) => s.creditBalance <= 0).map((s) => s.id);
        if (!ids.length) continue;
        const from = startOfDay(m.activatedAt ?? new Date());
        const candidates = await loadInvoicesForDebit({
            ...unpaidInvoiceWhere(ids),
            dueDate: { gte: from, lte: lookAhead },
            directDebitReminderSentAt: null
        });
        const already = await db.directDebitCharge.findMany({ where: { feePaymentId: { in: candidates.map((c) => c.id) } }, select: { feePaymentId: true } });
        const charged = new Set(already.map((a) => a.feePaymentId));
        const upcoming = candidates
            .filter((i) => !charged.has(i.id))
            .map((i) => ({ ...i, debitOn: nextRunOnOrAfter(settings, i.dueDate < today ? today : i.dueDate) }))
            .filter((i) => {
                if (!i.debitOn) return false;
                const days = Math.round((startOfDay(i.debitOn).getTime() - today.getTime()) / msDay);
                return days >= 1 && days <= settings.reminderDaysBefore;
            });
        if (!upcoming.length) continue;
        const names = new Map(students.map((s) => [s.id, studentName(s)]));
        const lines = upcoming
            .map((i) => `- ${names.get(i.studentId)}: ${i.invoiceName}, ${money(i.dueAmount)} (due ${fmtDate(i.dueDate)}), debited on ${fmtDate(i.debitOn!)}`)
            .join('\n');
        const sent = await sendDirectDebitEmail('REMINDER', m.email, {
            bankLast4: m.bankLast4,
            invoiceLines: lines,
            total: money(upcoming.reduce((sum, i) => sum + i.dueAmount, 0))
        });
        if (sent) {
            emails++;
            await db.feePayment.updateMany({ where: { id: { in: upcoming.map((i) => i.id) } }, data: { directDebitReminderSentAt: new Date() } });
        }
    }
    log(`reminders: ${emails} email(s) sent`);
    return { emails };
}

// ---------- webhooks ----------

async function notifyOffice(key: string, vars: Record<string, string | number | null | undefined>) {
    const to = await officeEmail();
    if (!to) return log('no office email set (Settings tab / OFFICE_EMAIL / EMAIL_FROM); office not emailed:', key);
    await sendDirectDebitEmail(key, to, vars);
}

/** Setup page finished: record the bank account + mandate, then optionally debit the balance already due. */
async function activateFromSetupIntent(setupIntentId: string) {
    const stripe = stripeClient();
    const si = await stripe.setupIntents.retrieve(setupIntentId, { expand: ['payment_method', 'mandate'] });
    if (si.metadata?.purpose !== PURPOSE_SETUP) return;
    if (si.status !== 'succeeded') {
        log(`setup intent ${si.id} is ${si.status}; waiting for setup_intent.succeeded`);
        return;
    }
    const rowId = Number(si.metadata.mandateRowId);
    const mandate = await db.directDebitMandate.findUnique({ where: { id: rowId } });
    if (!mandate) return log('setup for unknown mandate row', si.metadata.mandateRowId);

    const pm = si.payment_method as Stripe.PaymentMethod | null;
    const sMandate = si.mandate as Stripe.Mandate | null;
    if (!pm || !sMandate) return log('setup intent without payment method/mandate', si.id);
    if (mandate.stripeMandateId === sMandate.id && mandate.status === 'ACTIVE') return; // already done (event retried)

    const previousPm = mandate.stripePaymentMethodId;
    const updated = await db.directDebitMandate.update({
        where: { id: rowId },
        data: {
            status: 'ACTIVE',
            stripePaymentMethodId: pm.id,
            stripeMandateId: sMandate.id,
            bsbNumber: pm.au_becs_debit?.bsb_number ?? null,
            bankLast4: pm.au_becs_debit?.last4 ?? null,
            mandateUrl: (sMandate.payment_method_details as any)?.au_becs_debit?.url ?? null,
            activatedAt: new Date(),
            cancelledAt: null,
            statusChangedBy: mandate.email,
            statusReason: previousPm ? 'Bank account changed by the parent' : 'Set up by the parent'
        }
    });
    if (previousPm && previousPm !== pm.id) {
        await stripe.paymentMethods.detach(previousPm).catch((e) => log('old payment method detach failed:', e?.message));
    }
    log(`mandate ${updated.id} ACTIVE (${updated.email}) bsb ${updated.bsbNumber} ****${updated.bankLast4}`);

    let balanceText = '';
    if (si.metadata.payExistingBalance === 'true') {
        const before = startOfDay(updated.activatedAt!);
        const outcomes = await debitFamily(updated, (ids) => ({ ...unpaidInvoiceWhere(ids), dueDate: { lt: before } }), 'SETUP_BALANCE');
        const ok = outcomes.filter((o) => o.ok);
        if (ok.length) balanceText = `As requested, we have also started a debit of ${money(ok.reduce((s, o) => s + o.amount, 0))} for ${ok.length} invoice(s) already due. It takes 2-4 business days to clear.`;
    }
    const ddSettings = await getDirectDebitSettings();
    const reminderDays = ddSettings.reminderDaysBefore;
    const scheduleText = ddSettings.frequency === 'DAILY' ? 'on their due date' : `${describeSchedule(ddSettings)}, for invoices due since the last debit`;
    const family = await familyStudents(updated.email);
    await sendDirectDebitEmail('SETUP_CONFIRMED', updated.email, {
        studentNames: family.map(studentName).join(', '),
        bsb: updated.bsbNumber,
        bankLast4: updated.bankLast4,
        schedule: scheduleText,
        reminderText: reminderDays > 0 ? ` We will email you ${reminderDays} day(s) before each debit.` : '',
        agreementLink: updated.mandateUrl,
        balanceText
    });
}

async function markChargeFailed(chargeId: number, message: string) {
    const charge = await db.directDebitCharge.findUnique({ where: { id: chargeId }, include: { mandate: true } });
    if (!charge || charge.status === 'FAILED') return;
    const today = startOfToday();
    await db.$transaction(async (tx) => {
        await tx.directDebitCharge.update({ where: { id: chargeId }, data: { status: 'FAILED', failureMessage: message } });
        const fp = await tx.feePayment.findUnique({ where: { id: charge.feePaymentId } });
        if (!fp) return;
        // The overdue job skipped this invoice while the debit was clearing, so mark it overdue here when it is past due.
        const pastDue = fp.dueAmount > 0 && fp.status !== PaymentStatus.PAID && startOfDay(fp.dueDate) < today;
        await tx.feePayment.update({
            where: { id: fp.id },
            data: { directDebitInFlight: false, ...(pastDue ? { status: PaymentStatus.OVERDUE, hasOverDue: true, isActive: false } : {}) }
        });
        if (pastDue) await tx.student.update({ where: { id: charge.studentId }, data: { hasOverDue: true } });
        if (charge.stripePaymentIntentId) {
            await tx.paymentInstallment.create({
                data: {
                    feePaymentId: fp.id,
                    paidAmount: 0,
                    paymentMethod: PaymentMethod.ONLINE,
                    paymentStatus: PaymentStatus.FAILED,
                    remarks: `Direct debit failed: ${message}`.slice(0, 500),
                    receivedBy: DIRECT_DEBIT_RECEIVED_BY,
                    transactionId: charge.stripePaymentIntentId,
                    errorDetails: message,
                    isTransactionSucess: false,
                    paidDate: new Date()
                }
            });
        }
    }, TX_OPTIONS);
    const student = await db.student.findUnique({ where: { id: charge.studentId }, select: { akaalId: true, personalDetails: { select: { firstName: true, lastName: true } } } });
    const inv = await db.feePayment.findUnique({ where: { id: charge.feePaymentId }, select: { invoiceId: true, feeTemplate: { select: { invoiceName: true } } } });
    const vars = {
        amount: money(charge.amount),
        studentName: studentName(student),
        akaalId: student?.akaalId ?? charge.studentId,
        invoiceName: inv?.feeTemplate?.invoiceName ?? `Invoice #${charge.feePaymentId}`,
        invoiceNumber: inv?.invoiceId ?? `#${charge.feePaymentId}`,
        familyEmail: charge.mandate.email,
        failureReason: message
    };
    await sendDirectDebitEmail('DEBIT_FAILED', charge.mandate.email, vars);
    await notifyOffice('OFFICE_DEBIT_FAILED', vars);
    log(`charge ${chargeId} FAILED: ${message}`);
}

async function markChargeSucceeded(intent: Stripe.PaymentIntent) {
    const chargeId = Number(intent.metadata?.chargeId);
    const charge = await db.directDebitCharge.findUnique({ where: { id: chargeId } });
    if (!charge) return log('succeeded event for unknown charge', intent.metadata?.chargeId);
    if (charge.status === 'SUCCEEDED') return; // event retried
    const paid = Math.round((intent.amount_received || intent.amount) / 100);
    const today = startOfToday();
    await db.$transaction(async (tx) => {
        await tx.directDebitCharge.update({ where: { id: charge.id }, data: { status: 'SUCCEEDED', stripePaymentIntentId: intent.id } });
        const fp = await tx.feePayment.findUnique({ where: { id: charge.feePaymentId } });
        if (!fp) return;
        const newDue = Math.max(0, fp.dueAmount - paid);
        const status = newDue === 0 ? PaymentStatus.PAID : startOfDay(fp.dueDate) < today ? PaymentStatus.OVERDUE : PaymentStatus.PENDING;
        await tx.feePayment.update({
            where: { id: fp.id },
            data: {
                dueAmount: newDue,
                status,
                directDebitInFlight: false,
                hasDue: newDue > 0,
                hasOverDue: status === PaymentStatus.OVERDUE
            }
        });
        await tx.paymentInstallment.create({
            data: {
                feePaymentId: fp.id,
                paidAmount: paid,
                paymentMethod: PaymentMethod.ONLINE,
                paymentStatus: PaymentStatus.PAID,
                transactionId: intent.id,
                paidDate: new Date(),
                remarks: 'Direct debit (BECS) cleared.',
                receivedBy: DIRECT_DEBIT_RECEIVED_BY
            }
        });
        const stillOverdue = await tx.feePayment.count({
            where: { studentTermFee: { studentId: charge.studentId }, status: PaymentStatus.OVERDUE, dueAmount: { gt: 0 } }
        });
        await tx.student.update({ where: { id: charge.studentId }, data: { hasOverDue: stillOverdue > 0 } });
    }, TX_OPTIONS);
    log(`charge ${charge.id} SUCCEEDED $${paid}`);
}

/**
 * Handles the direct-debit events. Returns true when the event belonged to direct debit (so the card handlers must
 * not also process it). Throws on a processing error so the webhook answers 500 and Stripe retries.
 */
export async function handleDirectDebitEvent(event: Stripe.Event): Promise<boolean> {
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            if (session.mode !== 'setup' || session.metadata?.purpose !== PURPOSE_SETUP) return false;
            if (session.setup_intent) await activateFromSetupIntent(typeof session.setup_intent === 'string' ? session.setup_intent : session.setup_intent.id);
            return true;
        }
        case 'setup_intent.succeeded': {
            const si = event.data.object as Stripe.SetupIntent;
            if (si.metadata?.purpose !== PURPOSE_SETUP) return false;
            await activateFromSetupIntent(si.id);
            return true;
        }
        case 'payment_intent.succeeded': {
            const pi = event.data.object as Stripe.PaymentIntent;
            if (pi.metadata?.purpose !== PURPOSE_DEBIT) return false;
            await markChargeSucceeded(pi);
            return true;
        }
        case 'payment_intent.payment_failed':
        case 'payment_intent.canceled': {
            const pi = event.data.object as Stripe.PaymentIntent;
            if (pi.metadata?.purpose !== PURPOSE_DEBIT) return false;
            await markChargeFailed(Number(pi.metadata.chargeId), pi.last_payment_error?.message ?? (event.type === 'payment_intent.canceled' ? 'debit cancelled' : 'debit failed'));
            return true;
        }
        case 'payment_intent.processing': {
            const pi = event.data.object as Stripe.PaymentIntent;
            return pi.metadata?.purpose === PURPOSE_DEBIT;
        }
        case 'mandate.updated': {
            const m = event.data.object as Stripe.Mandate;
            if (m.status !== 'inactive') return true;
            const row = await db.directDebitMandate.findUnique({ where: { stripeMandateId: m.id } });
            if (!row || row.status === 'CANCELLED') return true;
            await db.directDebitMandate.update({
                where: { id: row.id },
                data: { status: 'CANCELLED', cancelledAt: new Date(), statusChangedBy: 'Stripe', statusReason: 'Mandate deactivated by the bank or Stripe' }
            });
            await notifyOffice('OFFICE_MANDATE_DEACTIVATED', { familyEmail: row.email, bankLast4: row.bankLast4 });
            await sendDirectDebitEmail('STOPPED_BY_BANK', row.email, { bankLast4: row.bankLast4 });
            return true;
        }
        case 'charge.dispute.created': {
            const dispute = event.data.object as Stripe.Dispute;
            const piId = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id;
            if (!piId) return false;
            const charge = await db.directDebitCharge.findUnique({ where: { stripePaymentIntentId: piId }, include: { mandate: true } });
            if (!charge) return false;
            await db.directDebitCharge.update({ where: { id: charge.id }, data: { disputed: true, officeAcknowledgedAt: null } });
            const [inv, student] = await Promise.all([
                db.feePayment.findUnique({ where: { id: charge.feePaymentId }, select: { invoiceId: true } }),
                db.student.findUnique({ where: { id: charge.studentId }, select: { personalDetails: { select: { firstName: true, lastName: true } } } })
            ]);
            await notifyOffice('OFFICE_DISPUTE', {
                familyEmail: charge.mandate.email,
                amount: money(charge.amount),
                studentName: studentName(student),
                invoiceNumber: inv?.invoiceId ?? `#${charge.feePaymentId}`
            });
            return true;
        }
        default:
            return false;
    }
}

/** Card / office payment guard: an invoice whose debit is clearing must not be paid again. */
export function assertNoDirectDebitInFlight(feePayment: { directDebitInFlight?: boolean | null } | null | undefined) {
    if (feePayment?.directDebitInFlight) {
        throw customError(
            'A direct debit for this invoice is being processed (2-4 business days). It cannot be paid again until that finishes.',
            'fail',
            409,
            true
        );
    }
}

/**
 * One run of the job. "debits": the debit run (scheduled run day, or Run now). "reminders": the daily reminder emails.
 * Records a one-line summary for the Settings tab.
 */
export async function runDirectDebitJob(trigger: 'schedule' | string, parts: { debits: boolean; reminders: boolean } = { debits: true, reminders: true }) {
    const out: string[] = [];
    if (parts.debits) {
        try {
            const r = await runDailyDirectDebits();
            out.push(`${r.started} debit(s) started, ${r.failed} not started, ${r.mandates} family(ies) checked`);
        } catch (error: any) {
            console.error('[direct-debit] debit run failed:', error);
            out.push(`debit run failed: ${error?.message ?? error}`);
        }
    }
    if (parts.reminders) {
        try {
            const r = await sendDirectDebitReminders();
            out.push(`${r.emails} reminder email(s)`);
        } catch (error: any) {
            console.error('[direct-debit] reminders failed:', error);
            out.push(`reminders failed: ${error?.message ?? error}`);
        }
    }
    const summary = `${trigger === 'schedule' ? 'Scheduled run' : `Run now by ${trigger}`}: ${out.join('; ')}`;
    if (parts.debits) await recordRunSummary(summary);
    log(summary);
    return { summary };
}
