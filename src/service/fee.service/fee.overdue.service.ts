import { db } from '../../utils/db.server';

/**
 * Single source of truth for "how much does this student owe that is overdue": every OVERDUE invoice with money
 * still owing, in EVERY term. Matches the Fees tab (admin and parent), which lists all terms with a term filter
 * (default All). Unpaid invoices are never copied into a new term, so nothing is counted twice.
 * Used by the check-in scan and list, the student profile and the teacher mark-present path.
 */

/** Overdue amount per student id (students with nothing overdue are absent from the map). */
export async function calculateOverdueAmounts(studentIds: number[], client: typeof db = db): Promise<Map<number, number>> {
    const amounts = new Map<number, number>();
    if (studentIds.length === 0) return amounts;

    const overdueInvoices = await client.feePayment.findMany({
        where: {
            status: 'OVERDUE',
            dueAmount: { gt: 0 },
            studentTermFee: { studentId: { in: studentIds } }
        },
        select: { dueAmount: true, studentTermFee: { select: { studentId: true } } }
    });
    for (const invoice of overdueInvoices) {
        const studentId = invoice.studentTermFee?.studentId;
        if (studentId == null) continue;
        amounts.set(studentId, (amounts.get(studentId) ?? 0) + invoice.dueAmount);
    }
    return amounts;
}

export async function calculateOverdueAmount(studentId: number, client: typeof db = db): Promise<number> {
    const amounts = await calculateOverdueAmounts([studentId], client);
    return amounts.get(studentId) ?? 0;
}
