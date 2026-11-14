import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createLoader } from './helpers/load.mjs';

const load = createLoader(['service/admin.service/admin.fee.service/fee.eligibility.rules.ts']);
const R = await load('service/admin.service/admin.fee.service/fee.eligibility.rules.ts');

const period = (month, year) => {
    const parsed = R.parseBillingPeriod(month, year);
    assert.equal(parsed.ok, true);
    return parsed.period;
};
const at = (iso) => new Date(iso);
const live = (iso) => ({ createdAt: at(iso) });
const left = (enrolled, ended, subjectName = 'Punjabi') => ({ enrolledAt: enrolled === null ? null : at(enrolled), endedAt: at(ended), subjectName });

describe('the browser sends a month name and a year: they are validated and turned into a Melbourne calendar-month period', () => {
    it('accepts any letter case and builds the whole month in Melbourne time (July 2026 = UTC+10, no daylight saving)', () => {
        const parsed = R.parseBillingPeriod('JuLy', ' 2026 ');
        assert.equal(parsed.ok, true);
        assert.equal(parsed.monthNumber, 7);
        assert.equal(parsed.period.label, 'July 2026');
        assert.equal(parsed.period.start.toISOString(), '2026-06-30T14:00:00.000Z');
        assert.equal(parsed.period.end.toISOString(), '2026-07-31T13:59:59.999Z');
    });
    it('follows daylight saving: January is UTC+11, April starts at +11 and ends at +10', () => {
        assert.equal(period('january', '2026').start.toISOString(), '2025-12-31T13:00:00.000Z');
        assert.equal(period('april', '2026').start.toISOString(), '2026-03-31T13:00:00.000Z');
        assert.equal(period('april', '2026').end.toISOString(), '2026-04-30T13:59:59.999Z');
    });
    it('December rolls into the next year correctly', () => {
        const december = period('december', '2026');
        assert.equal(december.label, 'December 2026');
        assert.equal(december.end.toISOString(), '2026-12-31T12:59:59.999Z');
    });
    it('rejects what used to produce an invoice number ending "NaN": bad month, bad or non-four-digit year', () => {
        for (const [m, y] of [['Julyy', '2026'], ['', '2026'], ['07', '2026'], ['july', '26'], ['july', 'abcd'], ['july', '1999'], ['july', '2101'], [undefined, '2026']]) {
            const parsed = R.parseBillingPeriod(m, y);
            assert.equal(parsed.ok, false, `${m}/${y}`);
            assert.ok(parsed.error.length > 10);
        }
    });
    it('a billing period that is not the current month only produces a warning (it never blocks: backdating is unchanged)', () => {
        const july = period('july', '2026');
        assert.equal(R.periodWarning(july, at('2026-07-10T00:00:00Z')), null);
        assert.match(R.periodWarning(july, at('2026-08-04T00:00:00Z')), /a past period/);
        assert.match(R.periodWarning(july, at('2026-06-01T00:00:00Z')), /a future period/);
    });
});

describe('eligibility: who may be billed for a fee group', () => {
    const july = period('july', '2026');

    it('1. only subject left (no live enrolment, history exists) -> skipped, with the date they left', () => {
        const d = R.decideInvoiceEligibility({ live: [], history: [left('2026-02-01T00:00:00Z', '2026-06-14T04:00:00Z', 'Kirtan')], period: july });
        assert.equal(d.eligible, false);
        assert.equal(d.code, 'LEFT_FEE_GROUP');
        assert.match(d.reason, /Left this fee group on 14 Jun 2026/);
        assert.equal(d.evidence.leftOn, '2026-06-14T04:00:00.000Z');
    });

    it('3. left every subject of the fee group (two subjects, history for both) -> skipped, the LATEST date is reported', () => {
        const d = R.decideInvoiceEligibility({ live: [], history: [left('2026-02-01T00:00:00Z', '2026-05-02T00:00:00Z', 'Punjabi'), left('2026-02-01T00:00:00Z', '2026-06-14T00:00:00Z', 'Kirtan')], period: july });
        assert.equal(d.code, 'LEFT_FEE_GROUP');
        assert.equal(d.evidence.leftOn, '2026-06-14T00:00:00.000Z');
    });

    it('no live enrolment and NO history (left before history was kept, the 4 July case) -> skipped, date explicitly unknown, nothing invented', () => {
        const d = R.decideInvoiceEligibility({ live: [], history: [], period: july });
        assert.equal(d.eligible, false);
        assert.equal(d.code, 'NO_ENROLLMENT_NO_HISTORY');
        assert.match(d.reason, /date they left is unknown/);
        assert.deepEqual(d.evidence, {});
    });

    it('2. left Punjabi but still in Kirtan (same fee group): the group fee continues unchanged', () => {
        const d = R.decideInvoiceEligibility({ live: [live('2026-02-01T00:00:00Z')], history: [left('2026-02-01T00:00:00Z', '2026-06-14T00:00:00Z', 'Punjabi')], period: july });
        assert.equal(d.eligible, true);
    });

    it('an ordinary enrolled student (no history) and a missing period are eligible', () => {
        assert.equal(R.decideInvoiceEligibility({ live: [live('2026-02-01T00:00:00Z')], history: [], period: july }).eligible, true);
        assert.equal(R.decideInvoiceEligibility({ live: [live('2026-08-01T00:00:00Z')], history: [left('2026-02-01T00:00:00Z', '2026-06-14T00:00:00Z')], period: null }).eligible, true);
    });

    describe('5. left, then enrolled again later: only a period inside the proven gap is skipped', () => {
        const input = { live: [live('2026-08-01T01:00:00Z')], history: [left('2026-02-01T00:00:00Z', '2026-06-14T04:00:00Z')] };
        it('July (between leaving and returning) -> skipped with both dates', () => {
            const d = R.decideInvoiceEligibility({ ...input, period: july });
            assert.equal(d.code, 'NOT_ENROLLED_IN_BILLING_PERIOD');
            assert.match(d.reason, /Not enrolled during July 2026: left on 14 Jun 2026 and enrolled again on 1 Aug 2026/);
            assert.equal(d.evidence.reEnrolledOn, '2026-08-01T01:00:00.000Z');
        });
        it('May (before they left), June (the month they left), August (the month they returned) -> still billable', () => {
            for (const m of ['may', 'june', 'august', 'september']) assert.equal(R.decideInvoiceEligibility({ ...input, period: period(m, '2026') }).eligible, true, m);
        });
    });

    it('4. left and re-enrolled inside the same period -> billable (no gap covers the whole period)', () => {
        const d = R.decideInvoiceEligibility({ live: [live('2026-07-20T00:00:00Z')], history: [left('2026-02-01T00:00:00Z', '2026-07-05T00:00:00Z')], period: july });
        assert.equal(d.eligible, true);
    });

    it('a gap is only declared when a history record PROVES the student had left: never from a live row\'s creation time alone', () => {
        // legacy student, no history: a live row created after the period must not make us skip a (possibly valid) invoice
        const d = R.decideInvoiceEligibility({ live: [live('2026-08-01T00:00:00Z')], history: [], period: july });
        assert.equal(d.eligible, true);
    });

    it('a history record with an unknown start is treated as covering its period, never as a reason to skip', () => {
        const d = R.decideInvoiceEligibility({ live: [live('2026-08-01T00:00:00Z')], history: [left(null, '2026-06-14T00:00:00Z')], period: period('march', '2026') });
        assert.equal(d.eligible, true);
    });

    it('another subject of the group that is still live and started before the period keeps the whole group billable', () => {
        const d = R.decideInvoiceEligibility({ live: [live('2026-01-20T00:00:00Z'), live('2026-08-01T00:00:00Z')], history: [left('2026-02-01T00:00:00Z', '2026-06-14T00:00:00Z')], period: july });
        assert.equal(d.eligible, true);
    });

    it('a later term is a different fee group row: history of an earlier group does not affect it (the caller passes only the group\'s own rows)', () => {
        assert.equal(R.decideInvoiceEligibility({ live: [live('2026-10-05T00:00:00Z')], history: [], period: period('october', '2026') }).eligible, true);
    });
});

describe('skip reasons shown to the admin', () => {
    it('every non-eligibility reason has clear text', () => {
        for (const code of ['STUDENT_NOT_FOUND', 'NO_FEE_RECORD', 'NO_AKAAL_ID', 'ALREADY_BILLED']) assert.ok(R.SKIP_REASON_TEXT[code].length > 20, code);
        assert.match(R.SKIP_REASON_TEXT.ALREADY_BILLED, /No second invoice was created/);
    });
});
