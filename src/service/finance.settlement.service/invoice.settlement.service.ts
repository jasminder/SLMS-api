import { db } from '../../utils/db.server';
import { describeSettlement } from './invoice.settlement.rules';
import type { InvoiceSettlement } from './invoice.settlement.rules';

type FeePaymentLike = { id: number; status: string | null; feeAmount: number | null; dueAmount: number; discountAmount?: number | null };

/**
 * Adds `settlement` (Scope of Work B1) to each invoice in a list. One extra query for the whole list, never one per invoice.
 * The invoice objects are returned unchanged apart from the new field, so existing readers keep working.
 */
export async function withSettlement<T extends FeePaymentLike>(feePayments: T[]): Promise<(T & { settlement: InvoiceSettlement })[]> {
    if (feePayments.length === 0) return [];
    const ids = feePayments.map((fp) => fp.id);
    const rows = await db.paymentInstallment.findMany({
        where: { feePaymentId: { in: ids } },
        select: { feePaymentId: true, paymentMethod: true, paidAmount: true, isTransactionSucess: true }
    });
    const byInvoice = new Map<number, typeof rows>();
    for (const row of rows) {
        const list = byInvoice.get(row.feePaymentId) ?? [];
        list.push(row);
        byInvoice.set(row.feePaymentId, list);
    }
    return feePayments.map((fp) => ({
        ...fp,
        settlement: describeSettlement({
            status: fp.status,
            feeAmount: fp.feeAmount,
            dueAmount: fp.dueAmount,
            discountAmount: fp.discountAmount ?? null, // a write-down is normally also a DISCOUNT row, so this is only a fallback
            installments: byInvoice.get(fp.id) ?? []
        })
    }));
}
