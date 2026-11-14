/**
 * Item 14: View Class and Class Records count a class with ONE shared rule (class.attendance.counts.ts).
 * Every student is in exactly one bucket, so present + notMarked + leave + absent always equals the roll.
 * Nothing here touches a database: the real source file runs on plain rows shaped like the live data.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { createLoader } from './helpers/load.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, '../src');
const FILE = 'service/admin.service/admin.teacher.service/class.attendance.counts.ts';
const { classifyClassAttendance, summariseClassAttendance } = await createLoader([FILE])(FILE);

/* The four row shapes that exist in the live data (checked on the Sundays of Jul to Nov 2026). */
const presentRow = () => ({ checkInData: { checkedIn: true, isMarked: true, isOnLeave: false }, classAttendance: { attendanceStatus: 'PRESENT' } });
const notMarkedRow = () => ({ checkInData: { checkedIn: true, isMarked: true, isOnLeave: false }, classAttendance: { attendanceStatus: 'ABSENT' } });
const leaveRow = () => ({ checkInData: { checkedIn: false, isMarked: false, isOnLeave: true }, classAttendance: { attendanceStatus: 'LEAVE' } });
const notHereRow = () => ({ checkInData: { checkedIn: false, isMarked: false, isOnLeave: false }, classAttendance: { attendanceStatus: 'ABSENT' } });
const many = (make, n) => Array.from({ length: n }, make);
const roll = (s) => s.present + s.notMarked + s.leave + s.absent;

describe('each live row shape lands in exactly one bucket', () => {
    it('checked in and marked present: present', () => assert.equal(classifyClassAttendance(presentRow()), 'present'));
    it('checked in at the gate, class status still ABSENT: notMarked (not absent)', () => assert.equal(classifyClassAttendance(notMarkedRow()), 'notMarked'));
    it('on approved leave: leave (not checked in, not absent)', () => assert.equal(classifyClassAttendance(leaveRow()), 'leave'));
    it('not at school: absent', () => assert.equal(classifyClassAttendance(notHereRow()), 'absent'));
    it('no school check-in row and no class row at all: absent', () => assert.equal(classifyClassAttendance({ checkInData: null, classAttendance: null }), 'absent'));
});

describe('edge cases', () => {
    it('a teacher mark of PRESENT wins over a leave flag (syncLeaveAttendance never overwrites PRESENT either)', () => {
        const row = { checkInData: { checkedIn: true, isMarked: true, isOnLeave: true }, classAttendance: { attendanceStatus: 'PRESENT' } };
        assert.equal(classifyClassAttendance(row), 'present');
    });
    it('PRESENT without a school check-in (1 such row exists on 26 Jul) is still present', () => {
        const row = { checkInData: { checkedIn: false, isMarked: false, isOnLeave: false }, classAttendance: { attendanceStatus: 'PRESENT' } };
        assert.equal(classifyClassAttendance(row), 'present');
    });
    it('the school-level leave flag alone is leave even when the class row is missing', () => {
        assert.equal(classifyClassAttendance({ checkInData: { checkedIn: false, isMarked: false, isOnLeave: true }, classAttendance: null }), 'leave');
    });
    it('class status LEAVE alone is leave even without the school-level flag', () => {
        assert.equal(classifyClassAttendance({ checkInData: { checkedIn: false, isMarked: false, isOnLeave: false }, classAttendance: { attendanceStatus: 'LEAVE' } }), 'leave');
    });
    it('marked by the office as absent at school level but never checked in: absent', () => {
        assert.equal(classifyClassAttendance({ checkInData: { checkedIn: false, isMarked: true, isOnLeave: false }, classAttendance: { attendanceStatus: 'ABSENT' } }), 'absent');
    });
    it('an empty class is all zeros', () => {
        assert.deepEqual(summariseClassAttendance([]), { total: 0, present: 0, notMarked: 0, checkedIn: 0, leave: 0, absent: 0, notCheckedIn: 0 });
    });
});

describe('the live examples from 14 Nov 2026 and the big Sundays', () => {
    it('class "SAT 5-6 pm": 4 students, 2 on leave. Checked in 0, leave 2, not here 2, adds up to 4 (was 0 + 4 + 2 = 6)', () => {
        const s = summariseClassAttendance([notHereRow(), notHereRow(), leaveRow(), leaveRow()]);
        assert.deepEqual(s, { total: 4, present: 0, notMarked: 0, checkedIn: 0, leave: 2, absent: 2, notCheckedIn: 2 });
        assert.equal(roll(s), s.total);
    });
    it('Class Records no longer counts leave as checked in (it showed Checked in 2 for that class)', () => {
        const s = summariseClassAttendance([notHereRow(), notHereRow(), leaveRow(), leaveRow()]);
        assert.equal(s.checkedIn, 0);
    });
    it('a roll of 40 that used to show 27 + 13 + 2 = 42: present 26, not marked 1, leave 2, not here 11', () => {
        const rows = [...many(presentRow, 26), ...many(notMarkedRow, 1), ...many(leaveRow, 2), ...many(notHereRow, 11)];
        const s = summariseClassAttendance(rows);
        assert.deepEqual(s, { total: 40, present: 26, notMarked: 1, checkedIn: 27, leave: 2, absent: 11, notCheckedIn: 11 });
        assert.equal(roll(s), 40);
    });
    it('the example class of 10: 6 present, 1 not marked, 2 on leave, 1 did not come', () => {
        const s = summariseClassAttendance([...many(presentRow, 6), notMarkedRow(), ...many(leaveRow, 2), notHereRow()]);
        assert.equal(s.total, 10);
        assert.equal(s.checkedIn, 7); // present + not marked, never leave
        assert.equal(roll(s), 10);
    });
});

describe('the buckets always add up to the roll, for any mix', () => {
    const shapes = [presentRow, notMarkedRow, leaveRow, notHereRow];
    it('every combination of 0 to 3 of each shape', () => {
        let combos = 0;
        for (let a = 0; a <= 3; a++)
            for (let b = 0; b <= 3; b++)
                for (let c = 0; c <= 3; c++)
                    for (let d = 0; d <= 3; d++) {
                        const s = summariseClassAttendance([...many(shapes[0], a), ...many(shapes[1], b), ...many(shapes[2], c), ...many(shapes[3], d)]);
                        assert.equal(roll(s), s.total);
                        assert.equal(s.checkedIn, a + b);
                        assert.equal(s.leave, c);
                        combos++;
                    }
        assert.equal(combos, 256);
    });
});

describe('Class Records uses the shared count', () => {
    const service = fs.readFileSync(path.join(SRC, 'service/admin.service/admin.teacher.service/admin.teacher.service.ts'), 'utf8');
    it('the service imports and calls summariseClassAttendance', () => {
        assert.match(service, /import \{ summariseClassAttendance \} from '\.\/class\.attendance\.counts'/);
        assert.match(service, /const attendanceSummary = summariseClassAttendance\(attendanceData\)/);
    });
    it('the old in-line counting loop is gone', () => {
        assert.doesNotMatch(service, /else if \(row\.checkInData\?\.checkedIn\) absent\+\+/);
    });
});
