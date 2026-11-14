/**
 * Issue 11: invoices are listed oldest (by creation date) first and newest last, on the student fee page and on the finance
 * dashboard. Nothing here touches a database: the real source files run against an in-memory stand-in.
 *
 *  1. the ordering rule itself (invoice.order.rules.ts), including the exact "March, March, February, April, May" symptom
 *  2. the REAL finance dashboard service against a stand-in that, like PostgreSQL, returns rows in storage order unless told to sort
 *  3. a static check that the student fee query can no longer return an unsorted list
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { createLoader } from './helpers/load.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, '../src');

/* ---------- a stand-in database that behaves like PostgreSQL about ORDER BY, skip and take ---------- */
const state = { payments: [], calls: [] };
const cmp = (a, b) => {
    if (a === b) return 0;
    if (a === null || a === undefined) return 1; // NULLs sort last in an ascending PostgreSQL ORDER BY
    if (b === null || b === undefined) return -1;
    return a < b ? -1 : 1;
};
const applyQuery = (rows, args) => {
    let out = [...rows]; // storage order
    const keys = (Array.isArray(args.orderBy) ? args.orderBy : args.orderBy ? [args.orderBy] : []).map((o) => Object.entries(o)[0]);
    if (keys.length > 0) {
        out.sort((x, y) => {
            for (const [field, dir] of keys) {
                if (typeof dir !== 'string') continue; // nested/relational ordering is not used here
                const r = cmp(x[field]?.getTime?.() ?? x[field], y[field]?.getTime?.() ?? y[field]);
                if (r !== 0) return dir === 'desc' ? -r : r;
            }
            return 0;
        });
    }
    if (args.skip) out = out.slice(args.skip);
    if (args.take !== undefined) out = out.slice(0, args.take);
    return out;
};
globalThis.__TEST_DB__ = {
    feePayment: {
        async findMany(args) {
            state.calls.push({ model: 'feePayment', args });
            return applyQuery(state.payments, args);
        },
        async count() {
            return state.payments.length;
        },
        async aggregate() {
            return { _sum: { dueAmount: 0, paidAmount: 0 } };
        }
    },
    paymentInstallment: {
        async aggregate() {
            return { _sum: { paidAmount: 0 } };
        }
    }
};

const rules = await createLoader(['service/admin.service/admin.fee.service/invoice.order.rules.ts'])('service/admin.service/admin.fee.service/invoice.order.rules.ts');
const dashboard = await createLoader(['service/admin.service/admin.finance.dashboard.service/admin.finance.dashboard.service.ts'])('service/admin.service/admin.finance.dashboard.service/admin.finance.dashboard.service.ts');

const inv = (id, name, created) => ({ id, invoiceId: String(id), invoiceName: name, createdAt: created === null ? null : new Date(created) });
const names = (list) => list.map((x) => x.invoiceName);

describe('ordering rule: oldest first, newest last', () => {
    // The student 5041 fee page from the Scope of Work screenshot: the database handed the rows back in this stored order.
    const storedOrder = [
        inv(1001, 'Annual fee 2026', '2026-01-20T01:00:00Z'),
        inv(1003, 'March', '2026-03-18T05:00:00Z'),
        inv(1002, 'February', '2026-02-10T05:00:00Z'),
        inv(1004, 'April', '2026-04-12T05:00:00Z'),
        inv(1005, 'May', '2026-05-09T05:00:00Z'),
        inv(1006, 'June', '2026-06-04T05:00:00Z'),
        inv(1007, 'July', '2026-07-04T05:00:00Z')
    ];
    it('puts the Scope of Work example (Annual, March, February, April, May...) into creation order', () => {
        assert.deepEqual(names(rules.sortInvoicesOldestFirst(storedOrder)), ['Annual fee 2026', 'February', 'March', 'April', 'May', 'June', 'July']);
    });
    it('does not change the list it was given and returns a new array', () => {
        const copy = [...storedOrder];
        const sorted = rules.sortInvoicesOldestFirst(storedOrder);
        assert.notEqual(sorted, storedOrder);
        assert.deepEqual(storedOrder, copy);
    });
    it('is stable for any stored order (every permutation of five invoices comes out the same)', () => {
        const five = storedOrder.slice(0, 5);
        const expected = names(rules.sortInvoicesOldestFirst(five));
        const permute = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => permute([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
        for (const p of permute(five)) assert.deepEqual(names(rules.sortInvoicesOldestFirst(p)), expected);
    });
    it('two invoices created at the same moment are ordered by id (the lower id was created first)', () => {
        const t = '2026-03-18T05:00:00.000Z';
        assert.deepEqual(rules.sortInvoicesOldestFirst([inv(30, 'b', t), inv(20, 'a', t), inv(25, 'c', t)]).map((x) => x.id), [20, 25, 30]);
    });
    it('accepts dates as Date objects or ISO strings', () => {
        const list = [{ id: 2, createdAt: '2026-03-01T00:00:00Z' }, { id: 1, createdAt: new Date('2026-04-01T00:00:00Z') }, { id: 3, createdAt: '2026-02-01T00:00:00Z' }];
        assert.deepEqual(rules.sortInvoicesOldestFirst(list).map((x) => x.id), [3, 2, 1]);
    });
    it('an invoice with no usable creation date goes last, in id order (same as PostgreSQL ascending NULLS LAST)', () => {
        const list = [inv(9, 'no date b', null), inv(5, 'new', '2026-06-01T00:00:00Z'), { id: 8, invoiceName: 'bad date', createdAt: 'not a date' }, inv(4, 'old', '2026-01-01T00:00:00Z')];
        assert.deepEqual(rules.sortInvoicesOldestFirst(list).map((x) => x.id), [4, 5, 8, 9]);
    });
    it('an unpaid invoice carried in from the previous term is placed by its own creation date, not stuck at the end', () => {
        const thisTerm = [inv(2002, 'March 2026', '2026-03-18T05:00:00Z'), inv(2001, 'February 2026', '2026-02-10T05:00:00Z')];
        const previousTermUnpaid = [inv(1900, 'November 2025', '2025-11-05T05:00:00Z')];
        assert.deepEqual(names(rules.sortInvoicesOldestFirst([...thisTerm, ...previousTermUnpaid])), ['November 2025', 'February 2026', 'March 2026']);
    });
    it('empty and single-item lists are fine', () => {
        assert.deepEqual(rules.sortInvoicesOldestFirst([]), []);
        assert.deepEqual(rules.sortInvoicesOldestFirst([inv(1, 'only', '2026-01-01T00:00:00Z')]).map((x) => x.id), [1]);
    });
});

describe('finance dashboard (the REAL service) lists invoices oldest first, across pages', () => {
    // 25 invoices created one per day, stored in a scrambled order (as after payments edit rows).
    const make = () => {
        const base = Date.UTC(2026, 0, 1);
        const rows = Array.from({ length: 25 }, (_, i) => ({ id: 500 + i, invoiceId: `5041${1000 + i}`, createdAt: new Date(base + i * 86400000), dueAmount: 50 - i, feeTemplate: { invoiceName: `Invoice ${i + 1}` }, studentTermFee: {} }));
        return [...rows].sort((a, b) => ((a.id * 7919) % 25) - ((b.id * 7919) % 25)); // deterministic shuffle
    };
    it('getAllFeePayments: page 1 holds the 10 oldest, page 2 the next 10, page 3 the newest 5, each in creation order', async () => {
        state.payments = make();
        const ids = [];
        for (const page of [0, 1, 2]) {
            const { feePayments, count } = await dashboard.getAllFeePayments('', page, 5, '', 'asc', '');
            assert.equal(count, 25);
            const createdAt = feePayments.map((f) => f.createdAt.getTime());
            assert.deepEqual(createdAt, [...createdAt].sort((a, b) => a - b), `page ${page + 1} is in creation order`);
            ids.push(...feePayments.map((f) => f.id));
        }
        assert.deepEqual(ids, Array.from({ length: 25 }, (_, i) => 500 + i), 'across all three pages the list runs oldest to newest with nothing repeated or skipped');
    });
    it('getAllFeePayments asks the database to sort by creation date, then id, whatever the due-amount setting is', async () => {
        for (const dueSort of ['asc', 'desc']) {
            state.payments = make();
            state.calls.length = 0;
            const { feePayments } = await dashboard.getAllFeePayments('', 0, 5, '', dueSort, '');
            const call = state.calls.find((c) => c.model === 'feePayment');
            assert.deepEqual(call.args.orderBy.slice(0, 2), [{ createdAt: 'asc' }, { id: 'asc' }]);
            assert.equal(feePayments[0].id, 500, `oldest first with due-amount sort "${dueSort}"`);
        }
    });
    it('selectAllFeePayments (used to pick students for the mail-out) uses the same order', async () => {
        state.payments = make().map((p) => ({ ...p, studentTermFee: { student: { id: p.id, akaalId: p.id, creditBalance: 0, personalDetails: { email: 'x' } } } }));
        state.calls.length = 0;
        const result = await dashboard.selectAllFeePayments('', 0, 5, '', 'asc', '');
        const call = state.calls.find((c) => c.model === 'feePayment');
        assert.deepEqual(call.args.orderBy.slice(0, 2), [{ createdAt: 'asc' }, { id: 'asc' }]);
        assert.ok(result);
    });
});

describe('student fee page query can no longer return an unsorted list (static check of the real source)', () => {
    const source = fs.readFileSync(path.join(SRC, 'service/admin.service/admin.student.service/admin.active.student.service/admin.active.student.service.ts'), 'utf8');
    const start = source.indexOf('export async function findStudentFeeDetails');
    const body = source.slice(start, source.indexOf('\nexport async function', start + 10));
    it('imports the ordering rule', () => {
        assert.match(source, /import \{ sortInvoicesOldestFirst \} from '\.\.\/\.\.\/admin\.fee\.service\/invoice\.order\.rules'/);
    });
    it('has exactly one return, and it sorts the combined (this term + previous term unpaid) list', () => {
        const returns = body.match(/^\s*return\b.*$/gm) ?? [];
        assert.equal(returns.length, 1, `returns found: ${JSON.stringify(returns)}`);
        assert.match(returns[0], /return sortInvoicesOldestFirst\(\[\.\.\.studentTermFees, \.\.\.previousTermUnpaid\]\);/);
    });
    it('the old unsorted early returns are gone', () => {
        assert.doesNotMatch(body, /return studentTermFees;/);
        assert.doesNotMatch(body, /return previousTermUnpaid;/);
    });
});
