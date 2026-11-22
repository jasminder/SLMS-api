/**
 * Scope of Work B1 (phase 1): say HOW an invoice was settled, next to its status pill, without changing the status.
 * "Paid" stays "Paid" (every filter, total and report keeps working); the label adds "in full", "part waived" or
 * "waived in full". An unpaid invoice gets "part paid" or "part waived" when that applies.
 *
 * Money in = successful payment rows that are not DISCOUNT. Waived = DISCOUNT rows (the office's write-downs),
 * falling back to the invoice's discountAmount for records that only have that field.
 * Pure and import-free so it can be unit-tested without a database.
 */
export type SettlementLabel = 'in full' | 'part waived' | 'waived in full' | 'part paid';

export type SettlementInput = {
    status: string | null;
    feeAmount: number | null;
    dueAmount: number;
    discountAmount: number | null;
    installments: readonly { paymentMethod: string; paidAmount: number; isTransactionSucess: boolean }[];
};

export type InvoiceSettlement = {
    label: SettlementLabel | null;
    /** the amount first invoiced */
    originalAmount: number;
    /** money actually received */
    paidAmount: number;
    /** written down by the office */
    waivedAmount: number;
    /** still owing */
    outstandingAmount: number;
};

export function describeSettlement(input: SettlementInput): InvoiceSettlement {
    let paid = 0;
    let waivedRows = 0;
    for (const row of input.installments) {
        if (!row.isTransactionSucess) continue;
        if (row.paymentMethod === 'DISCOUNT') waivedRows += row.paidAmount;
        else paid += row.paidAmount;
    }
    const waived = waivedRows > 0 ? waivedRows : Math.max(0, input.discountAmount ?? 0);
    const outstanding = Math.max(0, input.dueAmount);
    const original = input.feeAmount ?? paid + waived + outstanding;

    let label: SettlementLabel | null = null;
    if (input.status === 'PAID' || input.status === 'NODUES') {
        if (waived > 0 && paid === 0) label = 'waived in full';
        else if (waived > 0) label = 'part waived';
        else label = 'in full';
    } else if (outstanding === 0 && waived > 0 && paid === 0) {
        label = 'waived in full'; // nothing left to pay, but the status was never moved to Paid
    } else if (paid > 0) {
        label = 'part paid';
    } else if (waived > 0) {
        label = 'part waived';
    }
    return { label, originalAmount: original, paidAmount: paid, waivedAmount: waived, outstandingAmount: outstanding };
}
