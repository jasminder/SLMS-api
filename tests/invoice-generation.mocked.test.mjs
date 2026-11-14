/**
 * Issue 9: the REAL createFeeTemplateAndPayments, run against an in-memory stand-in for the database (no database of any kind
 * is touched). It checks the decisions the function makes: who is billed, who is skipped and why, duplicate safety, empty
 * templates, notifications, validation, and that the amounts and the fee-group rules are unchanged.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createLoader } from './helpers/load.mjs';

const clone = (value) => structuredClone(value);
const state = {};
const resetState = () =>
    Object.assign(state, { students: [], fees: [], live: [], hist: [], templates: [], payments: [], locks: [], historyQueries: 0, tableExists: true, nextId: 1, failCreateForFee: null, txCount: 0 });
resetState();

const db = {
    state,
    async $queryRaw() {
        return [{ ok: state.tableExists }];
    },
    async $executeRaw(strings, ...values) {
        state.locks.push(values[0]);
        return 0;
    },
    async $transaction(callback, options) {
        state.txCount++;
        state.lastTxOptions = options;
        const snapshot = clone({ templates: state.templates, payments: state.payments });
        try {
            return await callback(db);
        } catch (error) {
            state.templates = snapshot.templates; // a failed transaction leaves nothing behind
            state.payments = snapshot.payments;
            throw error;
        }
    },
    feeTemplate: {
        async findFirst({ where }) {
            return (
                state.templates.find((t) => (where.termSubjectGroupId === undefined || t.termSubjectGroupId === where.termSubjectGroupId) && t.invoiceName === where.invoiceName && (where.interval === undefined || t.interval === where.interval)) ?? null
            );
        },
        async create({ data }) {
            const row = { id: state.nextId++, ...clone(data) };
            state.templates.push(row);
            return clone(row);
        },
        async delete({ where }) {
            state.templates = state.templates.filter((t) => t.id !== where.id);
        }
    },
    student: {
        async findMany({ where }) {
            return state.students.filter((s) => where.id.in.includes(s.id)).map((s) => ({ id: s.id, akaalId: s.akaalId, personalDetails: { firstName: s.firstName, lastName: s.lastName } }));
        }
    },
    studentTermFee: {
        async findMany({ where }) {
            return state.fees.filter((f) => where.studentId.in.includes(f.studentId) && f.termId === where.termId && f.termSubjectGroupId === where.termSubjectGroupId);
        }
    },
    enrollment: {
        async findMany({ where }) {
            return state.live.filter((e) => where.studentId.in.includes(e.studentId) && e.termSubjectGroupId === where.termSubjectGroupId);
        }
    },
    enrollmentHistory: {
        async findMany({ where }) {
            state.historyQueries++;
            return state.hist.filter((h) => where.studentId.in.includes(h.studentId) && h.termSubjectGroupId === where.termSubjectGroupId);
        }
    },
    feePayment: {
        async findMany({ where }) {
            return state.payments.filter((p) => p.feeTemplateId === where.feeTemplateId && where.studentTermFeeId.in.includes(p.studentTermFeeId)).map((p) => ({ studentTermFeeId: p.studentTermFeeId }));
        },
        async create({ data }) {
            if (state.failCreateForFee !== null && data.studentTermFeeId === state.failCreateForFee) throw new Error('database error while creating a payment');
            const row = { id: state.nextId++, ...clone(data) };
            state.payments.push(row);
            return clone(row);
        }
    }
};
globalThis.__TEST_DB__ = db;

const load = createLoader(['service/admin.service/admin.fee.service/admin.fee.service.ts'], {
    stubFiles: {
        'service/notification.service/notification.service.ts':
            "export const getStudentNamesMap = async (ids) => new Map(ids.map((id) => [id, 'Student'])); export const createManyNotificationsAndPush = async (list) => { (globalThis.__TEST_NOTIFS__ = globalThis.__TEST_NOTIFS__ ?? []).push(...list); return list; };",
        'service/admin.service/admin.student.service/admin.active.student.service/admin.active.student.service.ts': 'export const autoApplyCreditToFeePaymentInTransaction = async () => undefined;'
    }
});
const { createFeeTemplateAndPayments } = await load('service/admin.service/admin.fee.service/admin.fee.service.ts');

const GROUP = 1;
const TERM = 1;
const addStudent = (id, akaalId, first = `Name${id}`) => state.students.push({ id, akaalId, firstName: first, lastName: 'Test' });
const addFee = (studentId, id = 100 + studentId, groupId = GROUP) => state.fees.push({ id, studentId, termId: TERM, termSubjectGroupId: groupId });
const addLive = (studentId, createdAt = '2026-02-01T00:00:00Z', groupId = GROUP) => state.live.push({ studentId, termSubjectGroupId: groupId, createdAt: new Date(createdAt) });
const addHist = (studentId, enrolledAt, endedAt, subjectName = 'Kirtan', groupId = GROUP) => state.hist.push({ studentId, termSubjectGroupId: groupId, enrolledAt: enrolledAt ? new Date(enrolledAt) : null, endedAt: new Date(endedAt), subjectName });
const request = (ids, extra = {}) => ({
    studentIds: ids.map(String),
    interval: 'MONTHLY',
    invoiceName: 'Kirtan_july_2026',
    notes: 'n',
    month: 'july',
    year: '2026',
    termName: 'Term 2026',
    termId: String(TERM),
    termSubjectGroupName: 'Kirtan',
    termSubjectGroupId: String(GROUP),
    dueDate: '2026-07-11T00:00:00.000Z',
    amount: '50',
    ...extra
});
const enrolledStudent = (id, akaalId) => {
    addStudent(id, akaalId);
    addFee(id);
    addLive(id);
};

beforeEach(() => {
    resetState();
    globalThis.__TEST_NOTIFS__ = [];
});
const rejects = (promise, statusCode) =>
    assert.rejects(promise, (error) => {
        assert.equal(error.statusCode, statusCode, error.message);
        return true;
    });

describe('who is billed and who is skipped (with reasons)', () => {
    it('one batch: the enrolled student is billed; each unusable student is skipped with its own clear reason; nobody fails the batch', async () => {
        enrolledStudent(1, 5001); // billed
        addStudent(2, 5002); addFee(2); // left, with history
        addHist(2, '2026-02-01T00:00:00Z', '2026-06-14T04:00:00Z');
        addStudent(3, 5003); addFee(3); // left before history was kept
        addStudent(4, 5004); addLive(4); // enrolled but no fee record
        addStudent(5, null); addFee(5); addLive(5); // no Akaal id
        const result = await createFeeTemplateAndPayments(request([1, 2, 3, 4, 5, 999]));
        assert.equal(result.createdCount, 1);
        assert.equal(result.skippedCount, 5);
        assert.equal(result.requestedCount, 6);
        const byId = Object.fromEntries(result.skipped.map((s) => [s.studentId, s]));
        assert.equal(byId[2].code, 'LEFT_FEE_GROUP');
        assert.match(byId[2].reason, /Left this fee group on 14 Jun 2026/);
        assert.equal(byId[3].code, 'NO_ENROLLMENT_NO_HISTORY');
        assert.match(byId[3].reason, /date they left is unknown/);
        assert.equal(byId[4].code, 'NO_FEE_RECORD');
        assert.equal(byId[5].code, 'NO_AKAAL_ID');
        assert.equal(byId[999].code, 'STUDENT_NOT_FOUND');
        assert.deepEqual([byId[2].akaalId, byId[2].name], [5002, 'Name2 Test']);
        assert.equal(state.payments.length, 1);
    });

    it('the result keeps the old fields too (message, feeTemplate, feePayments, skippedDeEnrolled) and adds the period', async () => {
        enrolledStudent(1, 5001);
        addStudent(3, 5003); addFee(3);
        const result = await createFeeTemplateAndPayments(request([1, 3]));
        assert.equal(result.message, 'FeeTemplate and FeePayments created successfully.');
        assert.ok(result.feeTemplate.id);
        assert.equal(result.feePayments.length, 1);
        assert.deepEqual(result.skippedDeEnrolled, [{ studentId: 3, akaalId: 5003 }]);
        assert.deepEqual(result.billingPeriod, { label: 'July 2026', month: 7, year: 2026 });
    });

    it('a duplicated id in the selection is billed once', async () => {
        enrolledStudent(1, 5001);
        const result = await createFeeTemplateAndPayments(request([1, 1, 1]));
        assert.equal(result.requestedCount, 1);
        assert.equal(state.payments.length, 1);
    });
});

describe('shared fee group and re-enrolment (history-aware)', () => {
    it('leaves one subject but another of the same group is still live: the group fee continues at the unchanged amount', async () => {
        addStudent(1, 5001); addFee(1);
        addLive(1, '2026-02-01T00:00:00Z'); // Kirtan still live
        addHist(1, '2026-02-01T00:00:00Z', '2026-06-14T04:00:00Z', 'Punjabi'); // Punjabi ended
        const result = await createFeeTemplateAndPayments(request([1]));
        assert.equal(result.createdCount, 1);
        assert.deepEqual([state.payments[0].feeAmount, state.payments[0].dueAmount, state.payments[0].adjustedFeeAmount, state.payments[0].status], [50, 50, 50, 'PENDING']);
    });

    it('leaves every subject of the group: skipped', async () => {
        addStudent(1, 5001); addFee(1);
        addHist(1, '2026-02-01T00:00:00Z', '2026-05-02T00:00:00Z', 'Punjabi');
        addHist(1, '2026-02-01T00:00:00Z', '2026-06-14T00:00:00Z', 'Kirtan');
        const result = await createFeeTemplateAndPayments(request([1]));
        assert.equal(result.createdCount, 0);
        assert.equal(result.skipped[0].code, 'LEFT_FEE_GROUP');
    });

    it('left, then came back: July (inside the gap) skipped, August billed', async () => {
        addStudent(1, 5001); addFee(1);
        addLive(1, '2026-08-01T01:00:00Z');
        addHist(1, '2026-02-01T00:00:00Z', '2026-06-14T04:00:00Z');
        const july = await createFeeTemplateAndPayments(request([1]));
        assert.equal(july.skipped[0].code, 'NOT_ENROLLED_IN_BILLING_PERIOD');
        const august = await createFeeTemplateAndPayments(request([1], { month: 'august', invoiceName: 'Kirtan_august_2026' }));
        assert.equal(august.createdCount, 1);
    });

    it('a different fee group is not affected by this group\'s history', async () => {
        enrolledStudent(1, 5001);
        addHist(1, '2026-02-01T00:00:00Z', '2026-06-14T00:00:00Z', 'Gurmat', 2); // other group
        assert.equal((await createFeeTemplateAndPayments(request([1]))).createdCount, 1);
    });

    it('the invoice number keeps its format: Akaal id + fee group id + two-digit month', async () => {
        enrolledStudent(1, 5041);
        await createFeeTemplateAndPayments(request([1]));
        assert.equal(state.payments[0].invoiceId, '50411' + '07');
    });
});

describe('duplicates, empty templates and notifications', () => {
    it('running the same template again never creates a second invoice (ALREADY_BILLED) and keeps the template', async () => {
        enrolledStudent(1, 5001);
        enrolledStudent(2, 5002);
        await createFeeTemplateAndPayments(request([1]));
        const second = await createFeeTemplateAndPayments(request([1, 2]));
        assert.equal(second.createdCount, 1);
        assert.equal(second.skipped.find((s) => s.studentId === 1).code, 'ALREADY_BILLED');
        assert.equal(state.payments.length, 2);
        assert.equal(state.templates.length, 1);
    });

    it('generation is serialised per fee group + invoice name (an advisory lock is taken inside the transaction)', async () => {
        enrolledStudent(1, 5001);
        await createFeeTemplateAndPayments(request([1]));
        assert.deepEqual(state.locks, ['fee-template:1:Kirtan_july_2026']);
        assert.equal(state.lastTxOptions.timeout, 120000);
    });

    it('nobody billed and the template was made by this call: no empty template is left behind', async () => {
        addStudent(1, 5001); addFee(1);
        const result = await createFeeTemplateAndPayments(request([1]));
        assert.equal(result.createdCount, 0);
        assert.equal(result.feeTemplate, null);
        assert.equal(result.message, 'No invoices were created.');
        assert.equal(state.templates.length, 0);
    });

    it('nobody billed but the template already existed: it is kept', async () => {
        enrolledStudent(1, 5001);
        await createFeeTemplateAndPayments(request([1]));
        const again = await createFeeTemplateAndPayments(request([1]));
        assert.equal(again.createdCount, 0);
        assert.equal(state.templates.length, 1);
    });

    it('ONLY students who really got an invoice are notified', async () => {
        enrolledStudent(1, 5001);
        addStudent(2, 5002); addFee(2); // left
        await createFeeTemplateAndPayments(request([1, 2]));
        assert.deepEqual(globalThis.__TEST_NOTIFS__.map((n) => n.studentId), [1]);
        assert.match(globalThis.__TEST_NOTIFS__[0].content, /new fee invoice/);
    });

    it('no notification at all when nobody was billed, and none when the transaction fails (nothing is saved either)', async () => {
        addStudent(2, 5002); addFee(2);
        await createFeeTemplateAndPayments(request([2]));
        assert.deepEqual(globalThis.__TEST_NOTIFS__, []);
        enrolledStudent(1, 5001);
        enrolledStudent(3, 5003);
        state.failCreateForFee = 103; // the second student's invoice fails with a real database error
        await assert.rejects(createFeeTemplateAndPayments(request([1, 3], { invoiceName: 'Kirtan_july_b_2026' })), /database error/);
        assert.deepEqual(globalThis.__TEST_NOTIFS__, []);
        assert.equal(state.payments.length, 0);
        assert.equal(state.templates.length, 0);
    });
});

describe('what the browser sends is validated on the server (before anything is read or written)', () => {
    it('bad month, bad year, bad due date, bad amount, no students: 400 and the database is never touched', async () => {
        enrolledStudent(1, 5001);
        for (const extra of [{ month: 'Julyy' }, { year: '26' }, { dueDate: 'not a date' }, { amount: '50.5' }, { amount: '-5' }, { termSubjectGroupId: 'abc' }]) {
            await rejects(createFeeTemplateAndPayments(request([1], extra)), 400);
        }
        await rejects(createFeeTemplateAndPayments(request([])), 400);
        await rejects(createFeeTemplateAndPayments(request(['x'])), 400);
        assert.equal(state.txCount, 0);
        assert.deepEqual(state.locks, []);
    });

    it('a billing period that is not the current month is reported as a warning only; the invoices are still created', async () => {
        enrolledStudent(1, 5001);
        const result = await createFeeTemplateAndPayments(request([1], { year: '2030', invoiceName: 'Kirtan_july_2030' }));
        assert.equal(result.createdCount, 1);
        assert.match(result.periodWarning, /future period/);
    });
});

describe('before the migration (EnrollmentHistory table missing)', () => {
    it('invoice generation keeps working with the live-enrolment rule alone and says history is not available', async () => {
        state.tableExists = false;
        enrolledStudent(1, 5001);
        addStudent(2, 5002); addFee(2); // not enrolled
        const result = await createFeeTemplateAndPayments(request([1, 2]));
        assert.equal(result.createdCount, 1);
        assert.equal(result.historyAvailable, false);
        assert.equal(result.skipped[0].code, 'NO_ENROLLMENT_NO_HISTORY');
        assert.equal(state.historyQueries, 0, 'the missing table is never queried');
    });
    it('with the table present the history is read once for the whole batch (not once per student)', async () => {
        enrolledStudent(1, 5001);
        enrolledStudent(2, 5002);
        const result = await createFeeTemplateAndPayments(request([1, 2]));
        assert.equal(result.historyAvailable, true);
        assert.equal(state.historyQueries, 1);
    });
});
