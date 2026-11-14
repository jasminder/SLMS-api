/**
 * Invoice ordering rule (Scope of Work item 11): wherever a list of invoices is shown, the OLDEST invoice (by creation date)
 * comes first and the NEWEST last. Pure and import-free so it can be unit-tested without a database.
 *
 * Why this exists: the student fee page used a database query with no ORDER BY, so PostgreSQL returned the rows in whatever
 * order they happened to be stored (an invoice that was edited, for example after a payment, can move), which produced
 * "March, March, February, April, May". The finance dashboard already orders in the database (createdAt, then id).
 *
 * Rule: oldest `createdAt` first; the same moment is broken by `id` (ids only ever go up, so a lower id was created earlier).
 * An invoice with no creation date at all is placed LAST, which matches how PostgreSQL orders NULLs in an ascending sort, so
 * the fee page and the finance dashboard agree even for such a row.
 */
export type InvoiceOrderKey = { id: number; createdAt?: Date | string | null };

const timeOf = (value: Date | string | null | undefined): number | null => {
    if (value === null || value === undefined) return null;
    const time = (value instanceof Date ? value : new Date(value)).getTime();
    return Number.isNaN(time) ? null : time;
};

export const compareInvoicesOldestFirst = (a: InvoiceOrderKey, b: InvoiceOrderKey): number => {
    const first = timeOf(a.createdAt);
    const second = timeOf(b.createdAt);
    if (first !== null && second !== null && first !== second) return first - second;
    if (first === null && second !== null) return 1; // no creation date: last
    if (first !== null && second === null) return -1;
    return a.id - b.id;
};

/** A NEW array, oldest invoice first. The input is never changed. */
export const sortInvoicesOldestFirst = <T extends InvoiceOrderKey>(invoices: readonly T[]): T[] => [...invoices].sort(compareInvoicesOldestFirst);
