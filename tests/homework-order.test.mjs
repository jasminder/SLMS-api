/**
 * Issue 13: the teacher's "All Homeworks" list is ordered newest first by creation date (id as the tie-break).
 * The REAL homework service runs against an in-memory stand-in that, like PostgreSQL, returns rows in storage order unless the
 * query asks for a sort. Nothing touches a database.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, it } from 'node:test';
import { createLoader } from './helpers/load.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SERVICE = 'service/homework.service/homework.service.ts';

const state = { rows: [], calls: [] };
const compare = (a, b) => {
    if (a === b) return 0;
    if (a === null || a === undefined) return 1;
    if (b === null || b === undefined) return -1;
    return a < b ? -1 : 1;
};
const value = (row, field) => row[field]?.getTime?.() ?? row[field];
globalThis.__TEST_DB__ = {
    homework: {
        async findMany(args) {
            state.calls.push(args);
            let rows = state.rows.filter((r) => (args.where.teacherId === undefined || r.teacherId === args.where.teacherId) && (!args.where.termSubjectLevelId?.in || args.where.termSubjectLevelId.in.includes(r.termSubjectLevelId)) && (args.where.termSubjectLevelId?.in || args.where.termSubjectLevelId === undefined || r.termSubjectLevelId === args.where.termSubjectLevelId) && (args.where.sectionId === undefined || r.sectionId === args.where.sectionId));
            const keys = (Array.isArray(args.orderBy) ? args.orderBy : args.orderBy ? [args.orderBy] : []).map((o) => Object.entries(o)[0]);
            if (keys.length) {
                rows = [...rows].sort((x, y) => {
                    for (const [field, dir] of keys) {
                        const r = compare(value(x, field), value(y, field));
                        if (r !== 0) return dir === 'desc' ? -r : r;
                    }
                    return 0;
                });
            }
            return rows;
        }
    }
};
const { findAllHomeworksBySubjectsList, findAllHomeworkByTermAndSection, findAllAssignedHomeworkByTermAndSection } = await createLoader([SERVICE])(SERVICE);

// The live list from teacher 74's screen (Uploaded dates, top to bottom): 12/07, 11/10, 30/08, 26/07, 23/08, 06/09, 18/10, 19/07, 01/11, 16/08.
const STORED_ORDER = [[12, 7], [11, 10], [30, 8], [26, 7], [23, 8], [6, 9], [18, 10], [19, 7], [1, 11], [16, 8]];
const make = () =>
    STORED_ORDER.map(([d, m], i) => ({ id: 100 + i, teacherId: 74, termSubjectLevelId: 7, sectionId: 3, title: `hw ${d}/${m}`, createdAt: new Date(Date.UTC(2026, m - 1, d, 1, 0, 0)), updatedAt: new Date(Date.UTC(2026, m - 1, d, 1, 0, 0)) }));
const label = (rows) => rows.map((r) => r.title.replace('hw ', ''));

beforeEach(() => {
    state.rows = make();
    state.calls = [];
});

describe('All Homeworks (findAllHomeworksBySubjectsList)', () => {
    it('the screen reported by the client: the ten homeworks now come back newest first', async () => {
        const rows = await findAllHomeworksBySubjectsList(['7'], '74');
        assert.deepEqual(label(rows), ['1/11', '18/10', '11/10', '6/9', '30/8', '23/8', '16/8', '26/7', '19/7', '12/7']);
    });
    it('asks the database to sort by creation date descending, then id descending', async () => {
        await findAllHomeworksBySubjectsList(['7'], '74');
        assert.deepEqual(state.calls[0].orderBy, [{ createdAt: 'desc' }, { id: 'desc' }]);
    });
    it('two homeworks created at the same moment: the higher id comes first', async () => {
        const t = new Date(Date.UTC(2026, 10, 1, 1, 0, 0));
        state.rows = [{ id: 5, teacherId: 74, termSubjectLevelId: 7, sectionId: 3, title: 'a', createdAt: t, updatedAt: t }, { id: 9, teacherId: 74, termSubjectLevelId: 7, sectionId: 3, title: 'b', createdAt: t, updatedAt: t }, { id: 7, teacherId: 74, termSubjectLevelId: 7, sectionId: 3, title: 'c', createdAt: t, updatedAt: t }];
        assert.deepEqual((await findAllHomeworksBySubjectsList(['7'], '74')).map((r) => r.id), [9, 7, 5]);
    });
    it('the order follows createdAt, not updatedAt: an edited older homework does not jump to the top', async () => {
        state.rows = make();
        state.rows.find((r) => r.title === 'hw 12/7').updatedAt = new Date(Date.UTC(2026, 10, 5, 1, 0, 0)); // edited in November
        const rows = await findAllHomeworksBySubjectsList(['7'], '74');
        assert.equal(rows[0].title, 'hw 1/11');
        assert.equal(rows[rows.length - 1].title, 'hw 12/7');
    });
    it('still only this teacher\'s homework in the chosen classes (the filter is unchanged)', async () => {
        state.rows = [...make(), { id: 900, teacherId: 99, termSubjectLevelId: 7, sectionId: 3, title: 'other teacher', createdAt: new Date(), updatedAt: new Date() }, { id: 901, teacherId: 74, termSubjectLevelId: 8, sectionId: 3, title: 'other class', createdAt: new Date(), updatedAt: new Date() }];
        const rows = await findAllHomeworksBySubjectsList(['7'], '74');
        assert.equal(rows.length, 10);
        assert.ok(rows.every((r) => r.teacherId === 74 && r.termSubjectLevelId === 7));
        assert.deepEqual(state.calls[0].where, { termSubjectLevelId: { in: [7] }, teacherId: 74 });
    });
    it('without the sort the stand-in (like the database) returns storage order, so this test would have caught the bug', async () => {
        const unsorted = await globalThis.__TEST_DB__.homework.findMany({ where: { teacherId: 74, termSubjectLevelId: { in: [7] } } });
        assert.deepEqual(label(unsorted), ['12/7', '11/10', '30/8', '26/7', '23/8', '6/9', '18/10', '19/7', '1/11', '16/8']);
    });
});

describe('the other homework lists are untouched', () => {
    it('the per-class teacher list and the assigned list still sort by createdAt descending only', async () => {
        await findAllHomeworkByTermAndSection('7', '3', '74');
        await findAllAssignedHomeworkByTermAndSection('7', '3', '74');
        assert.deepEqual(state.calls[0].orderBy, { createdAt: 'desc' });
        assert.deepEqual(state.calls[1].orderBy, { createdAt: 'desc' });
    });
    it('source guard: only the All Homeworks query gained the new ordering', () => {
        const source = fs.readFileSync(path.resolve(here, '..', 'src', SERVICE), 'utf8');
        assert.equal((source.match(/orderBy: \[\{ createdAt: 'desc' \}, \{ id: 'desc' \}\]/g) ?? []).length, 1);
        const allList = source.slice(source.indexOf('export async function findAllHomeworksBySubjectsList'), source.indexOf('export async function findAllHomeworkByTermAndSectionForAdmin'));
        assert.match(allList, /orderBy: \[\{ createdAt: 'desc' \}, \{ id: 'desc' \}\]/);
    });
});
