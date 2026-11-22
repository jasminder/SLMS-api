/**
 * Item 24: the weekly absence list.
 *  1. the rules (attendance.watchlist.rules.ts): four absences in a row (leave skipped) or below 60% for the whole term,
 *     the percentage counted the SAME way as the student list and profile (leave counts as not attended)
 *  2. the weekly job and the dashboard card against a small stand-in database
 * Nothing here touches a real database.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, beforeEach } from 'node:test';
import { createLoader } from './helpers/load.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, '../src');
const RULES = 'service/attendance.watchlist.service/attendance.watchlist.rules.ts';
const SERVICE = 'service/attendance.watchlist.service/attendance.watchlist.service.ts';
const rules = await createLoader([RULES])(RULES);

const TERM_START = new Date('2026-01-24T00:00:00Z');
const AS_OF = new Date('2026-11-14T12:00:00Z');
// weekly days, oldest first, starting 1 Feb 2026
const day = (n, checkedIn, isOnLeave = false) => ({ date: new Date(Date.UTC(2026, 1, 1 + n * 7)), checkedIn, isOnLeave });
const series = (flags) => flags.map((f, i) => day(i, f === 'P', f === 'L'));
const run = (flags, cleared = null) => rules.evaluateStudent(series(flags), TERM_START, AS_OF, cleared);

describe('four absences in a row', () => {
    it('four missed days at the end of the run: on the list, reason recorded', () => {
        const r = run(['P', 'P', 'P', 'P', 'P', 'P', 'A', 'A', 'A', 'A']);
        assert.equal(r.absencesInARow, 4);
        assert.equal(r.isCandidate, true);
        assert.deepEqual(r.reasons, ['4 absences in a row']);
    });
    it('three missed days is not enough', () => {
        const r = run(['P', 'P', 'P', 'P', 'P', 'P', 'P', 'A', 'A', 'A']);
        assert.equal(r.absencesInARow, 3);
        assert.equal(r.isCandidate, false);
    });
    it('a day on leave is skipped: it neither adds to the run nor breaks it', () => {
        assert.equal(run(['P', 'P', 'P', 'P', 'P', 'A', 'L', 'A', 'A', 'A']).absencesInARow, 4);
        assert.equal(run(['P', 'P', 'P', 'P', 'P', 'P', 'A', 'A', 'L', 'L']).absencesInARow, 2);
    });
    it('an attended day breaks the run', () => {
        assert.equal(run(['P', 'P', 'P', 'A', 'A', 'P', 'A', 'A']).absencesInARow, 2);
    });
});

describe('below 60% for the whole term', () => {
    it('same number as the student list: checked-in days divided by all days, leave counted as not attended', () => {
        // 6 attended of 10 days (2 of the 10 are leave days) = 60% exactly: not below 60
        const exactly60 = run(['P', 'P', 'P', 'P', 'P', 'P', 'A', 'A', 'L', 'L']);
        assert.equal(exactly60.termPercent, 60);
        assert.equal(exactly60.reasons.some((r) => /below/.test(r)), false);
        // 5 of 10 = 50%
        const half = run(['P', 'P', 'P', 'P', 'P', 'A', 'A', 'A', 'L', 'L']);
        assert.equal(half.termPercent, 50);
        assert.equal(half.isCandidate, true);
        assert.match(half.reasons.join(' '), /Attendance 50% for the term so far, below 60%/);
    });
    it('leave days are in the denominator (the student with 100% only when leave is ignored is not rescued)', () => {
        // 7 attended of 10 with 3 leave days: 70% on screen; with leave excluded it would be 100%. Neither is below 60.
        assert.equal(run(['P', 'P', 'P', 'P', 'P', 'P', 'P', 'L', 'L', 'L']).termPercent, 70);
        // 5 attended of 10 with 5 leave days: 50% on screen, so the list shows them, like the profile does.
        const r = run(['P', 'P', 'P', 'P', 'P', 'L', 'L', 'L', 'L', 'L']);
        assert.equal(r.termPercent, 50);
        assert.equal(r.isCandidate, true);
    });
    it('too few recorded days to judge: fewer than 4 days is never flagged on percentage', () => {
        const r = run(['A', 'A', 'A']);
        assert.equal(r.reasons.some((x) => /below/.test(x)), false);
        assert.equal(r.isCandidate, false);
    });
    it('days before the term start and after "now" are ignored', () => {
        const days = [{ date: new Date('2025-12-01T00:00:00Z'), checkedIn: false, isOnLeave: false }, ...series(['P', 'P', 'P', 'P']), { date: new Date('2026-12-20T00:00:00Z'), checkedIn: false, isOnLeave: false }];
        const r = rules.evaluateStudent(days, TERM_START, AS_OF, null);
        assert.equal(r.daysInTerm, 4);
        assert.equal(r.termPercent, 100);
        assert.equal(r.isCandidate, false);
    });
    it('both reasons are recorded together when both apply', () => {
        const r = run(['P', 'A', 'A', 'A', 'A', 'A']);
        assert.equal(r.reasons.length, 2);
    });
});

describe('a student who was cleared is flagged again only after a NEW absence', () => {
    const flags = ['P', 'P', 'A', 'A', 'A', 'A'];
    it('cleared after their last absence: not a candidate', () => {
        assert.equal(run(flags, new Date(Date.UTC(2026, 2, 20))).isCandidate, false);
    });
    it('a new absence after the clear: a candidate again', () => {
        // cleared on 10 Mar; the 7th day (15 Mar) is a new absence
        assert.equal(run([...flags, 'A'], new Date(Date.UTC(2026, 2, 10))).isCandidate, true);
    });
    it('never cleared: a candidate', () => assert.equal(run(flags, null).isCandidate, true));
});

/* ---------- the weekly job and the dashboard card, on a small stand-in database ---------- */
function makeDb({ students, flags = [] }) {
    const created = [];
    const store = { flags: flags.map((f, i) => ({ id: i + 1, ...f })) };
    return {
        created,
        store,
        term: { findFirst: async () => ({ startDate: TERM_START }) },
        student: { findMany: async () => students },
        skipReport: {
            findMany: async ({ where }) => store.flags.filter((f) => f.className === where.className && (where.isClosed === undefined || f.isClosed === where.isClosed)).map((f) => ({ ...f, student: students.find((s) => s.id === f.studentId) ? { id: f.studentId, akaalId: students.find((s) => s.id === f.studentId).akaalId, personalDetails: { firstName: 'A', lastName: 'B' } } : { id: f.studentId, akaalId: 0, personalDetails: null } })),
            create: async ({ data }) => {
                const row = { id: store.flags.length + 1, isClosed: false, createdAt: new Date(), updatedAt: new Date(), ...data };
                store.flags.push(row);
                created.push(row);
                return row;
            }
        },
        schoolCheckInAttendance: { findMany: async ({ where }) => students.filter((s) => where.studentId.in.includes(s.id)).flatMap((s) => s.schoolCheckInAttendance.map((d) => ({ studentId: s.id, ...d }))) }
    };
}
const student = (id, flags) => ({ id, akaalId: 5000 + id, schoolCheckInAttendance: series(flags) });

describe('the weekly job and the dashboard card', () => {
    let service;
    beforeEach(async () => {
        service = null;
    });
    const load = async (db) => {
        globalThis.__TEST_DB__ = db;
        return createLoader([SERVICE, RULES])(SERVICE);
    };

    it('flags only the students who qualify, with the reason recorded, and nobody twice', async () => {
        const db = makeDb({ students: [student(1, ['P', 'P', 'P', 'P', 'A', 'A', 'A', 'A']), student(2, ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P']), student(3, ['P', 'A', 'A', 'A', 'A', 'A'])] });
        service = await load(db);
        const first = await service.runWeeklyAbsenceFlagging(AS_OF);
        assert.deepEqual(first, { created: 2, alreadyFlagged: 0, checked: 3 });
        assert.deepEqual(db.created.map((f) => f.studentId).sort(), [1, 3]);
        assert.ok(db.created.every((f) => f.className === 'Weekly absence list' && f.reason.length > 0));
        assert.ok(db.created.every((f) => f.teacherId === undefined && f.adminId === undefined));
        const second = await service.runWeeklyAbsenceFlagging(AS_OF);
        assert.deepEqual(second, { created: 0, alreadyFlagged: 2, checked: 3 });
    });

    it('a student whose flag was cleared is not flagged again until a new absence', async () => {
        const db = makeDb({
            students: [student(1, ['P', 'P', 'A', 'A', 'A', 'A'])],
            flags: [{ studentId: 1, className: 'Weekly absence list', isClosed: true, reason: 'x', createdAt: new Date(Date.UTC(2026, 2, 1)), updatedAt: new Date(Date.UTC(2026, 3, 20)) }]
        });
        service = await load(db);
        assert.equal((await service.runWeeklyAbsenceFlagging(AS_OF)).created, 0);
        db.store.flags = [];
        db.store.flags.push({ id: 1, studentId: 1, className: 'Weekly absence list', isClosed: true, reason: 'x', createdAt: new Date(Date.UTC(2026, 1, 1)), updatedAt: new Date(Date.UTC(2026, 1, 20)) });
        assert.equal((await service.runWeeklyAbsenceFlagging(AS_OF)).created, 1);
    });

    it('the card lists the open automatic flags with the current numbers, most absences first', async () => {
        const db = makeDb({
            students: [student(1, ['P', 'P', 'P', 'P', 'A', 'A', 'A', 'A']), student(3, ['P', 'A', 'A', 'A', 'A', 'A', 'A'])],
            flags: [
                { studentId: 1, className: 'Weekly absence list', isClosed: false, reason: '4 absences in a row', createdAt: new Date(), updatedAt: new Date() },
                { studentId: 3, className: 'Weekly absence list', isClosed: false, reason: '6 absences in a row', createdAt: new Date(), updatedAt: new Date() }
            ]
        });
        service = await load(db);
        const rows = await service.listAbsenceWatchlist(AS_OF);
        assert.deepEqual(rows.map((r) => [r.akaalId, r.absencesInARow]), [[5003, 6], [5001, 4]]);
        assert.equal(rows[0].termPercent, 14.3);
        assert.ok(rows.every((r) => r.skipReportId > 0 && r.reason.length > 0));
    });

    it('with no current term nothing is created', async () => {
        const db = makeDb({ students: [student(1, ['A', 'A', 'A', 'A'])] });
        db.term.findFirst = async () => null;
        service = await load(db);
        assert.deepEqual(await service.runWeeklyAbsenceFlagging(AS_OF), { created: 0, alreadyFlagged: 0, checked: 0 });
        assert.deepEqual(await service.listAbsenceWatchlist(AS_OF), []);
    });
});

describe('wiring', () => {
    const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
    it('the job runs on Friday morning, school time, and can be switched off', () => {
        const job = read('cron/weeklyAbsenceWatchlist.ts');
        assert.doesNotMatch(job, /'0 21 \* \* [06]'/);
        assert.match(job, /'0 6 \* \* 5'/);
        assert.match(job, /timezone: 'Australia\/Sydney'/);
        assert.match(job, /ABSENCE_WATCHLIST_DISABLED/);
        assert.match(fs.readFileSync(path.join(SRC, '../index.ts'), 'utf8'), /import '\.\/src\/cron\/weeklyAbsenceWatchlist'/);
    });
    it('the card route is admin only', () => {
        assert.match(read('route/admin.route/admin.dashboard.route/admin.dashboard.route.ts'), /route\('\/absence-watchlist'\)\.get\(protectRoute, restrict\('ADMIN'\)/);
    });
});
