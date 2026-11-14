import { db } from '../../utils/db.server';

/**
 * Single source of truth for "how much does this student owe that is overdue".
 * Mirrors what the admin Fees tab lists (findStudentFeeDetails): the current term plus the
 * term we just left. Older terms are not counted, so every screen shows the same number.
 */

/** Ids of the terms whose invoices count towards the overdue figure: current term + previous term. */
export async function getOverdueTermIds(client: typeof db = db): Promise<number[]> {
    const currentTerm = await client.term.findFirst({ where: { currentTerm: true }, select: { id: true } });
    if (!currentTerm) return [];
    const previousTerm = await client.term.findFirst({
        where: { id: { not: currentTerm.id } },
        orderBy: { endDate: 'desc' },
        select: { id: true }
    });
    return previousTerm ? [currentTerm.id, previousTerm.id] : [currentTerm.id];
}

/** Overdue amount per student id (students with nothing overdue are absent from the map). */
export async function calculateOverdueAmounts(studentIds: number[], client: typeof db = db): Promise<Map<number, number>> {
    const amounts = new Map<number, number>();
    if (studentIds.length === 0) return amounts;

    const termIds = await getOverdueTermIds(client);
    if (termIds.length === 0) return amounts;

    const overdueInvoices = await client.feePayment.findMany({
        where: {
            status: 'OVERDUE',
            dueAmount: { gt: 0 },
            studentTermFee: { studentId: { in: studentIds }, termId: { in: termIds } }
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
