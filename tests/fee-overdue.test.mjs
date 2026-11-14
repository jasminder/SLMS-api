/**
 * Issues 2 and 3: the overdue figure shown on scan / check-in list / profile / teacher alert comes from ONE shared calculation
 * (src/service/fee.service/fee.overdue.service.ts). Nothing here touches a database: the real source files run against an
 * in-memory stand-in that applies the same filters the service sends, with synthetic terms and invoices.
 *
 * IMPORTANT - how to read the "CURRENT behaviour" tests: a few cases below pin down what the code does TODAY so that a later
 * change shows up as a deliberate edit of the test. They are NOT approved accounting policy. Whether credit should be netted,
 * whether debts older than the previous term should count, and what a term rollover should do are open questions for the school.
 *
 *  1. calculateOverdueAmount(s): current term, previous term, old terms, statuses, zero balances, batches, term selection
 *  2. CURRENT behaviour (not policy): credit is not netted; a carried-forward invoice and its originals are both counted
 *  3. the live figure replaces a stale stored one on the check-in list (fetchSchoolCheckInAttendance)
 *  4. the scan (markSchoolCheckInAttendanceForStudent) and the teacher mark-present return the live figure and alert only when > 0
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createLoader } from './helpers/load.mjs';

/* ---------- synthetic data + a stand-in database ---------- */
const state = { terms: [], invoices: [], students: {}, writes: [] };
const reset = () => {
    state.terms = [];
    state.invoices = [];
    state.students = {};
    state.writes.length = 0;
    globalThis.__TEST_IO__ = [];
};

// Terms as in production: 5 is current, 4 ended 2025-12-14 (the "previous" term), 3 and 2 are older.
const standardTerms = () => [
    { id: 2, currentTerm: false, endDate: new Date('2024-12-08') },
    { id: 3, currentTerm: false, endDate: new Date('2025-07-06') },
    { id: 4, currentTerm: false, endDate: new Date('2025-12-14') },
    { id: 5, currentTerm: true, endDate: new Date('2026-12-06') }
];
let nextId = 1;
const invoice = (studentId, termId, status, dueAmount) => ({ id: nextId++, status, dueAmount, studentTermFee: { studentId, termId } });

globalThis.__TEST_DB__ = {
    term: {
        async findFirst(args = {}) {
            let rows = [...state.terms];
            if (args.where?.currentTerm !== undefined) rows = rows.filter((t) => t.currentTerm === args.where.currentTerm);
            if (args.where?.id?.not !== undefined) rows = rows.filter((t) => t.id !== args.where.id.not);
            if (args.orderBy?.endDate === 'desc') rows.sort((a, b) => b.endDate - a.endDate);
            return rows[0] ? { id: rows[0].id } : null;
        }
    },
    feePayment: {
        async findMany(args) {
            const w = args.where;
            return state.invoices
                .filter((i) => i.status === w.status)
                .filter((i) => i.dueAmount > (w.dueAmount?.gt ?? -Infinity))
                .filter((i) => w.studentTermFee.studentId.in.includes(i.studentTermFee.studentId))
                .filter((i) => w.studentTermFee.termId.in.includes(i.studentTermFee.termId))
                .map((i) => ({ dueAmount: i.dueAmount, studentTermFee: { studentId: i.studentTermFee.studentId } }));
        }
    },
    // The remaining models exist only so the check-in and teacher flows can run; every write goes into state.writes (in memory).
    schoolCheckInAttendance: {
        async findMany(args) {
            if (state.checkInRows) return state.checkInRows; // the check-in list
            return []; // updateStudentLastTwoDaysAttendance
        },
        async findFirst() {
            return { id: 77, studentId: 5327, checkedIn: false };
        },
        async update(args) {
            state.writes.push(['schoolCheckInAttendance.update', args.data]);
            return { id: 77, ...args.data };
        }
    },
    student: {
        async findUnique() {
            return state.students.record ?? { akaalId: 5323, personalDetails: { firstName: 'Mehreen', lastName: 'Dhillon' } };
        },
        async update(args) {
            state.writes.push(['student.update', args.data]);
            return {};
        }
    },
    classAttendance: {
        async findFirst() {
            return { id: 9, schoolCheckInAttendance: { isCheckedOut: false } };
        },
        async updateMany(args) {
            state.writes.push(['classAttendance.updateMany', args.data]);
            return { count: 1 };
        }
    }
};

const FEE = 'service/fee.service/fee.overdue.service.ts';
const CHECKIN = 'service/admin.service/admin.checkin.service/admin.checkin.service.ts';
const TEACHER = 'service/teacher.service/teacher.attendance.service/teacher.attendance.service.ts';

// The socket server and the notification/push service are replaced: nothing is emitted or sent, everything is recorded.
const stubFiles = {
    'sockets/socket.ts': 'export const getIo = () => ({ emit: (...args) => { (globalThis.__TEST_IO__ = globalThis.__TEST_IO__ ?? []).push(args); } });\n',
    'service/notification.service/notification.service.ts':
        'export const createNotificationAndPush = async () => {}; export const createManyNotificationsAndPush = async () => {}; export const getStudentFirstName = async () => "Student"; export const getStudentNamesMap = async () => new Map();\n'
};
const fee = await createLoader([FEE])(FEE);
const checkin = await createLoader([CHECKIN], { stubFiles })(CHECKIN);
const teacher = await createLoader([TEACHER], { stubFiles })(TEACHER);

const alerts = () => globalThis.__TEST_IO__.filter((e) => e[0] === 'feeOverdueAlert');

describe('calculateOverdueAmount: which invoices count', () => {
    beforeEach(() => {
        reset();
        state.terms = standardTerms();
    });
    it('1. current term only: one $50 overdue invoice -> 50 (5286)', async () => {
        state.invoices = [invoice(1, 5, 'OVERDUE', 50)];
        assert.equal(await fee.calculateOverdueAmount(1), 50);
    });
    it('2. current term $300 + previous term $150 -> 450 (5205, 5467, 5505)', async () => {
        state.invoices = [invoice(1, 5, 'OVERDUE', 300), invoice(1, 4, 'OVERDUE', 150)];
        assert.equal(await fee.calculateOverdueAmount(1), 450);
    });
    it('3. a debt in an OLDER term (T3 $150) is not counted -> 0 (5237)', async () => {
        state.invoices = [invoice(1, 3, 'OVERDUE', 150), invoice(1, 5, 'PAID', 0)];
        assert.equal(await fee.calculateOverdueAmount(1), 0);
        // and with both an old and a current debt only the current one counts
        state.invoices.push(invoice(1, 2, 'OVERDUE', 150), invoice(1, 5, 'OVERDUE', 50));
        assert.equal(await fee.calculateOverdueAmount(1), 50);
    });
    it('4. an invoice that is PENDING (not overdue yet) is not counted even if money is owed', async () => {
        state.invoices = [invoice(1, 5, 'PENDING', 100)];
        assert.equal(await fee.calculateOverdueAmount(1), 0);
    });
    it('5. an OVERDUE invoice with nothing left to pay (dueAmount 0) is not counted', async () => {
        state.invoices = [invoice(1, 5, 'OVERDUE', 0), invoice(1, 4, 'PAID', 0)];
        assert.equal(await fee.calculateOverdueAmount(1), 0);
    });
});

describe('calculateOverdueAmounts: batches and term selection', () => {
    beforeEach(() => {
        reset();
        state.terms = standardTerms();
    });
    it('6. two students in one call: only the student who owes is in the map; the other reads as 0', async () => {
        state.invoices = [invoice(1, 5, 'OVERDUE', 300), invoice(1, 4, 'OVERDUE', 150), invoice(2, 5, 'PAID', 0)];
        const map = await fee.calculateOverdueAmounts([1, 2]);
        assert.deepEqual([...map.entries()], [[1, 450]]);
        assert.equal(await fee.calculateOverdueAmount(2), 0);
        assert.equal((await fee.calculateOverdueAmounts([])).size, 0, 'an empty list needs no lookup');
    });
    it('7. no current term set: nothing is overdue (empty map, 0)', async () => {
        state.terms = standardTerms().map((t) => ({ ...t, currentTerm: false }));
        state.invoices = [invoice(1, 5, 'OVERDUE', 300)];
        assert.equal((await fee.calculateOverdueAmounts([1])).size, 0);
        assert.equal(await fee.calculateOverdueAmount(1), 0);
    });
    it('8. only one term exists: just that term counts', async () => {
        state.terms = [{ id: 5, currentTerm: true, endDate: new Date('2026-12-06') }];
        state.invoices = [invoice(1, 5, 'OVERDUE', 300), invoice(1, 4, 'OVERDUE', 150)];
        assert.deepEqual(await fee.getOverdueTermIds(), [5]);
        assert.equal(await fee.calculateOverdueAmount(1), 300);
    });
    it('9. the previous term is the one that ENDED latest, not the one with the highest id', async () => {
        state.terms = [
            { id: 9, currentTerm: false, endDate: new Date('2024-06-30') }, // highest id, but the oldest
            { id: 2, currentTerm: false, endDate: new Date('2025-12-14') }, // lowest id, but ended most recently
            { id: 5, currentTerm: true, endDate: new Date('2026-12-06') }
        ];
        assert.deepEqual(await fee.getOverdueTermIds(), [5, 2]);
        state.invoices = [invoice(1, 9, 'OVERDUE', 999), invoice(1, 2, 'OVERDUE', 150), invoice(1, 5, 'OVERDUE', 300)];
        assert.equal(await fee.calculateOverdueAmount(1), 450);
    });
});

describe('CURRENT behaviour only - NOT approved accounting policy', () => {
    beforeEach(() => {
        reset();
        state.terms = standardTerms();
    });
    it('10. CURRENT: credit is not netted. A student with $50 credit and $100 overdue is reported as $100 (5241 policy question is open)', async () => {
        state.invoices = [invoice(1, 5, 'OVERDUE', 100)];
        state.students[1] = { creditBalance: 50 }; // the service never reads it
        assert.equal(await fee.calculateOverdueAmount(1), 100);
    });
    it('11. CURRENT: a carried-forward "Previous term unpaid balance" invoice AND its original are both counted ($150 + $150 = $300). Known term-rollover double count, not a policy decision', async () => {
        const original = invoice(1, 4, 'OVERDUE', 150); // the unpaid invoice in the previous term, left untouched at rollover
        const carried = invoice(1, 5, 'OVERDUE', 150); // the PREV_ copy created in the new term
        state.invoices = [original, carried];
        assert.equal(await fee.calculateOverdueAmount(1), 300);
    });
});

describe('the live figure replaces the stale stored one', () => {
    beforeEach(() => {
        reset();
        state.terms = standardTerms();
    });
    it('12. check-in list: stored overDue 250 + hasOverDue true becomes live 0 + false; a record with no student is left unchanged', async () => {
        const stale = { id: 1, studentId: 1, student: { id: 1, overDue: 250, hasOverDue: true, name: 'A' } };
        const owes = { id: 2, studentId: 2, student: { id: 2, overDue: null, hasOverDue: false, name: 'B' } };
        const orphan = { id: 3, studentId: 3, student: null };
        state.checkInRows = [stale, owes, orphan];
        state.invoices = [invoice(2, 5, 'OVERDUE', 300), invoice(2, 4, 'OVERDUE', 150)];
        const rows = await checkin.fetchSchoolCheckInAttendance();
        state.checkInRows = undefined;
        assert.deepEqual([rows[0].student.overDue, rows[0].student.hasOverDue], [0, false]);
        assert.deepEqual([rows[1].student.overDue, rows[1].student.hasOverDue], [450, true]);
        assert.deepEqual(rows[2], orphan);
        assert.equal(rows[0].student.name, 'A', 'other student fields are kept');
        assert.equal(stale.student.overDue, 250, 'the input rows are not mutated');
    });
});

describe('scan and teacher mark-present return the live figure and alert only when above 0', () => {
    beforeEach(() => {
        reset();
        state.terms = standardTerms();
    });
    it('13a. scan, nothing overdue: overDueAmount 0, hasOverDue false, no alert', async () => {
        state.invoices = [invoice(5327, 5, 'PAID', 0)];
        const result = await checkin.markSchoolCheckInAttendanceForStudent('5327');
        assert.equal(result.overDueAmount, 0);
        assert.equal(result.hasOverDue, false);
        assert.equal(alerts().length, 0);
        assert.equal(result.akaalId, 5323);
        assert.equal(result.studentName, 'Mehreen Dhillon');
    });
    it('13b. scan, $450 overdue (current $300 + previous $150): overDueAmount 450, hasOverDue true, one alert carrying 450', async () => {
        state.invoices = [invoice(5327, 5, 'OVERDUE', 300), invoice(5327, 4, 'OVERDUE', 150), invoice(5327, 3, 'OVERDUE', 150)];
        const result = await checkin.markSchoolCheckInAttendanceForStudent('5327');
        assert.equal(result.overDueAmount, 450);
        assert.equal(result.hasOverDue, true);
        assert.deepEqual(alerts(), [['feeOverdueAlert', { studentId: '5327', overDueAmount: 450 }]]);
    });
    it('13c. teacher mark-present, nothing overdue: 0, false, no alert', async () => {
        state.invoices = [];
        state.students.record = { personalDetails: { firstName: 'Mehreen' } };
        const result = await teacher.markStudentAsPresent('5327', '9');
        assert.equal(result.overDueAmount, 0);
        assert.equal(result.hasOverDue, false);
        assert.equal(alerts().length, 0);
    });
    it('13d. teacher mark-present, $450 overdue: 450, true, one alert carrying 450', async () => {
        state.invoices = [invoice(5327, 5, 'OVERDUE', 300), invoice(5327, 4, 'OVERDUE', 150)];
        state.students.record = { personalDetails: { firstName: 'Mehreen' } };
        const result = await teacher.markStudentAsPresent('5327', '9');
        assert.equal(result.overDueAmount, 450);
        assert.equal(result.hasOverDue, true);
        assert.deepEqual(alerts(), [['feeOverdueAlert', { studentId: '5327', overDueAmount: 450 }]]);
    });
});
