import { db } from '../../../../utils/db.server';

/**
 * Scope of Work B7: money events in the student activity record (invoices, payments, waivers, credit).
 * Read-only. Nothing is copied into StudentProfileActivity: every event is read from the record that already holds it
 * (FeePayment, PaymentInstallment, StudentCreditEntry), so past events show too and the two can never disagree.
 * Rows have the same shape as profile activities; ids are strings ("inv-12") so they never clash with numeric ids.
 */
export type MoneyActivity = {
    id: string;
    actionType: string;
    description: string;
    metadata: null;
    details?: string;
    performedByEmail: string;
    createdAt: Date;
};

const METHOD: Record<string, string> = {
    CASH: 'cash',
    ONLINE: 'online',
    CREDIT_CARD: 'card',
    SCHOOL: 'at school',
    OTHER: 'other',
    CREDIT_BALANCE: 'credit balance',
    DISCOUNT: 'waiver',
    NA: 'not recorded'
};
const dollars = (n: number) => `$${n}`;
const day = (d: Date | null | undefined) => (d ? d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Australia/Sydney' }) : null);
const note = (remarks: string | null | undefined) => (remarks && remarks.trim() && remarks !== 'No remarks' ? remarks.trim() : null);
const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' · ') || undefined;

export async function getStudentMoneyActivities(studentId: number): Promise<MoneyActivity[]> {
    const invoices = await db.feePayment.findMany({
        where: { studentTermFee: { studentId } },
        select: {
            id: true,
            invoiceId: true,
            feeAmount: true,
            dueDate: true,
            createdAt: true,
            paymentInstallment: {
                select: { id: true, paidAmount: true, paidDate: true, paymentMethod: true, remarks: true, receivedBy: true, createdAt: true, isTransactionSucess: true }
            }
        }
    });

    // Credit history exists only once the B4 migration is applied; until then credit use is shown from payment rows.
    let credit: Awaited<ReturnType<typeof db.studentCreditEntry.findMany>> = [];
    try {
        credit = await db.studentCreditEntry.findMany({ where: { studentId } });
    } catch (error) {
        console.warn('[activity] StudentCreditEntry not readable (B4 migration not applied?):', (error as Error).message.split('\n')[0]);
    }
    const creditPaymentIds = new Set(credit.map((c) => c.paymentInstallmentId).filter((id): id is number => id !== null));

    const events: MoneyActivity[] = [];
    const invoiceNo = new Map<number, string>();

    for (const inv of invoices) {
        const no = inv.invoiceId ?? String(inv.id);
        invoiceNo.set(inv.id, no);
        if (inv.createdAt) {
            events.push({
                id: `inv-${inv.id}`,
                actionType: 'INVOICE_CREATED',
                description: `Invoice ${no} created for ${dollars(inv.feeAmount ?? 0)}`,
                metadata: null,
                details: join(day(inv.dueDate) && `due ${day(inv.dueDate)}`),
                performedByEmail: 'System',
                createdAt: inv.createdAt
            });
        }
        for (const p of inv.paymentInstallment) {
            if (!p.isTransactionSucess) continue;
            if (p.paymentMethod === 'DISCOUNT') {
                if (p.paidAmount === 0) continue;
                events.push({
                    id: `pay-${p.id}`,
                    actionType: p.paidAmount > 0 ? 'FEE_WAIVED' : 'FEE_INCREASED',
                    description: p.paidAmount > 0 ? `${dollars(p.paidAmount)} waived on invoice ${no}` : `Invoice ${no} increased by ${dollars(-p.paidAmount)}`,
                    metadata: null,
                    details: join(note(p.remarks)),
                    performedByEmail: p.receivedBy?.trim() || 'ADMIN',
                    createdAt: p.createdAt
                });
                continue;
            }
            // A credit payment made since B4 is shown once, from the credit history (which says where the credit came from).
            if (p.paymentMethod === 'CREDIT_BALANCE' && creditPaymentIds.has(p.id)) continue;
            events.push({
                id: `pay-${p.id}`,
                actionType: p.paymentMethod === 'CREDIT_BALANCE' ? 'CREDIT_USED' : 'PAYMENT_RECEIVED',
                description:
                    p.paymentMethod === 'CREDIT_BALANCE'
                        ? `${dollars(p.paidAmount)} credit used on invoice ${no}`
                        : `${dollars(p.paidAmount)} paid on invoice ${no} (${METHOD[p.paymentMethod] ?? p.paymentMethod.toLowerCase()})`,
                metadata: null,
                details: join(p.paidDate && day(p.paidDate) !== day(p.createdAt) ? `paid ${day(p.paidDate)}` : null, note(p.remarks)),
                performedByEmail: p.receivedBy?.trim() || 'ADMIN',
                createdAt: p.createdAt
            });
        }
    }

    for (const c of credit) {
        const no = c.feePaymentId ? invoiceNo.get(c.feePaymentId) ?? String(c.feePaymentId) : null;
        const amount = dollars(Math.abs(c.amount));
        const description =
            c.kind === 'OPENING_BALANCE'
                ? `Credit balance of ${amount} when credit history started`
                : c.kind === 'ADDED'
                  ? `${amount} credit added (${METHOD[c.paymentMethod ?? 'NA'] ?? c.paymentMethod})`
                  : c.kind === 'OVERPAYMENT'
                    ? `${amount} overpayment moved to credit${no ? ` (invoice ${no})` : ''}`
                    : c.kind === 'APPLIED_TO_INVOICE'
                      ? `${amount} credit used${no ? ` on invoice ${no}` : ''}`
                      : `Credit corrected ${c.amount > 0 ? 'up' : 'down'} by ${amount}`;
        events.push({
            id: `credit-${c.id}`,
            actionType: `CREDIT_${c.kind}`,
            description,
            metadata: null,
            details: join(`credit now ${dollars(c.balanceAfter)}`, c.kind === 'ADDED' && day(c.entryDate) !== day(c.createdAt) ? `received ${day(c.entryDate)}` : null, c.note),
            performedByEmail: c.createdByEmail ?? 'System',
            createdAt: c.createdAt
        });
    }

    return events;
}
