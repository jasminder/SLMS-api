import { CreditEntryKind, PaymentMethod, Prisma } from '@prisma/client';
import { db } from '../../utils/db.server';
import { customError } from '../../utils/customError';

/**
 * Scope of Work B4: the ONLY way a student's credit balance may change. It moves Student.creditBalance and writes a
 * StudentCreditEntry (amount, balance after, kind, method, date, note, invoice, who) in the same transaction, so the
 * history always adds up to the balance. Never write Student.creditBalance directly anywhere else.
 */
type Tx = Prisma.TransactionClient;

export type CreditActor = { userId?: number | null; email?: string | null };

export type CreditChange = {
    studentId: number;
    /** positive adds credit, negative uses or reduces it */
    amount: number;
    kind: CreditEntryKind;
    paymentMethod?: PaymentMethod | null;
    entryDate?: Date;
    note?: string | null;
    feePaymentId?: number | null;
    paymentInstallmentId?: number | null;
    actor?: CreditActor;
};

export async function recordCreditChange(tx: Tx, change: CreditChange) {
    if (!Number.isInteger(change.amount) || change.amount === 0) {
        throw customError('The credit amount must be a whole number of dollars, and not zero.', 'fail', 400, true);
    }
    const student = await tx.student.update({
        where: { id: change.studentId },
        data: { creditBalance: { increment: change.amount } },
        select: { creditBalance: true }
    });
    if (student.creditBalance < 0) {
        // Rolls the whole transaction back: credit can never go below zero.
        throw customError(`This would take the credit below zero (available: $${student.creditBalance - change.amount}).`, 'fail', 400, true);
    }
    return tx.studentCreditEntry.create({
        data: {
            studentId: change.studentId,
            amount: change.amount,
            balanceAfter: student.creditBalance,
            kind: change.kind,
            paymentMethod: change.paymentMethod ?? null,
            entryDate: change.entryDate ?? new Date(),
            note: change.note?.trim() || null,
            feePaymentId: change.feePaymentId ?? null,
            paymentInstallmentId: change.paymentInstallmentId ?? null,
            createdByUserId: change.actor?.userId ?? null,
            createdByEmail: change.actor?.email ?? 'System'
        }
    });
}

const RECEIVED_METHODS: PaymentMethod[] = ['CASH', 'ONLINE', 'CREDIT_CARD', 'SCHOOL', 'OTHER'];

/** "Add credit": money received as credit, with the same details as a fee payment (amount, payment type, date, note). */
export async function addStudentCredit(
    studentId: number,
    input: { amount: number; paymentMethod: string; entryDate: string; note: string },
    actor: CreditActor
) {
    const method = String(input.paymentMethod).toUpperCase() as PaymentMethod;
    if (!RECEIVED_METHODS.includes(method)) throw customError('Please choose how the money was received.', 'fail', 400, true);
    if (!(input.amount > 0)) throw customError('Please enter an amount above $0.', 'fail', 400, true);
    const date = new Date(input.entryDate);
    if (Number.isNaN(date.getTime())) throw customError('Please enter the date the money was received.', 'fail', 400, true);
    if (!input.note?.trim()) throw customError('Please add a note saying what this credit is for.', 'fail', 400, true);
    return db.$transaction((tx) =>
        recordCreditChange(tx, { studentId, amount: Math.round(input.amount), kind: 'ADDED', paymentMethod: method, entryDate: date, note: input.note, actor })
    );
}

/** A correction (up or down) with a required reason. Replaces typing a new figure over the balance. */
export async function correctStudentCredit(studentId: number, input: { amount: number; note: string }, actor: CreditActor) {
    if (!input.note?.trim()) throw customError('Please give the reason for this correction.', 'fail', 400, true);
    return db.$transaction((tx) => recordCreditChange(tx, { studentId, amount: Math.round(input.amount), kind: 'CORRECTION', note: input.note, actor }));
}

/** Newest first: what the Fee page shows under "Credit history". */
export async function getStudentCreditHistory(studentId: number) {
    const [student, entries] = await Promise.all([
        db.student.findUnique({ where: { id: studentId }, select: { creditBalance: true } }),
        db.studentCreditEntry.findMany({ where: { studentId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })
    ]);
    if (!student) throw customError('Student not found.', 'fail', 404, true);
    const invoiceIds = [...new Set(entries.map((e) => e.feePaymentId).filter((id): id is number => id !== null))];
    const invoices = invoiceIds.length
        ? await db.feePayment.findMany({ where: { id: { in: invoiceIds } }, select: { id: true, invoiceId: true } })
        : [];
    const invoiceNumber = new Map(invoices.map((i) => [i.id, i.invoiceId]));
    return {
        creditBalance: student.creditBalance,
        entries: entries.map((e) => ({ ...e, invoiceNumber: e.feePaymentId ? invoiceNumber.get(e.feePaymentId) ?? null : null }))
    };
}
