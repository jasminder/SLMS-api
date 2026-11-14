import assert from 'node:assert/strict';
import { describe, it, after } from 'node:test';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createLoader } from './helpers/load.mjs';

// Real client helper (no imports, runs directly) and the real server duplicate key.
const clientHelper = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../SLMS-client/src/lib/dateOnly.ts');
const { toDateOnly, storedDobToPickerDate } = await import(pathToFileURL(clientHelper).href);
const load = createLoader(['service/teacher.duplicate.service/teacher.duplicate.rules.ts']);
const R = await load('service/teacher.duplicate.service/teacher.duplicate.rules.ts');

const ORIGINAL_TZ = process.env.TZ;
after(() => { if (ORIGINAL_TZ === undefined) delete process.env.TZ; else process.env.TZ = ORIGINAL_TZ; });

const ZONES = ['Australia/Melbourne', 'Pacific/Auckland', 'Pacific/Fiji', 'Asia/Kolkata', 'America/Los_Angeles'];
// Winter, summer, and a day around Melbourne's daylight-saving changes.
const PICKED = [[2010, 5, 12], [2009, 1, 15], [1985, 10, 3], [2012, 4, 1], [2000, 12, 31]];

describe('teacher DOB submitted as YYYY-MM-DD keeps the picked calendar day in every browser time zone', () => {
    for (const zone of ZONES) {
        it(zone, () => {
            process.env.TZ = zone;
            for (const [y, m, d] of PICKED) {
                const picked = new Date(y, m - 1, d); // react-datepicker: local midnight
                const expected = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const sent = toDateOnly(picked);
                assert.equal(sent, expected, `${zone}: sent value`);
                // What the server's duplicate check sees after the API parses the string (new Date(DOB)).
                assert.equal(R.dobDayKey(new Date(sent)), expected, `${zone}: server day for ${expected}`);
                assert.equal(R.dobDayKey(sent), expected);
            }
        });
    }
    it('same person picked in any zone gives the same duplicate key', () => {
        const keys = new Set();
        for (const zone of ZONES) {
            process.env.TZ = zone;
            keys.add(R.identityKey('Rajveer', 'Kaur', new Date(toDateOnly(new Date(1990, 2, 7)))));
        }
        assert.equal(keys.size, 1);
    });
});

describe('re-opening a stored DOB (admin edit form) shows and re-sends the same day', () => {
    for (const zone of ZONES) {
        it(zone, () => {
            process.env.TZ = zone;
            // Stored values are Melbourne-midnight instants (winter UTC+10, summer UTC+11) and plain UTC midnight.
            const stored = ['2010-05-11T14:00:00.000Z', '2009-02-14T13:00:00.000Z', '2010-05-12T00:00:00.000Z'];
            const expected = ['2010-05-12', '2009-02-15', '2010-05-12'];
            stored.forEach((s, i) => assert.equal(toDateOnly(storedDobToPickerDate(s)), expected[i], `${zone} ${s}`));
        });
    }
});

describe('documents the original bug (old behaviour: toISOString of local midnight)', () => {
    it('Auckland and Fiji move the day back; Melbourne, India and Los Angeles happen to be unaffected', () => {
        const dayAfterOld = (zone) => { process.env.TZ = zone; return R.dobDayKey(new Date(2010, 4, 12).toISOString()); };
        // Melbourne reads the instant back in its own zone, so it only goes wrong for zones that differ from Melbourne.
        assert.equal(dayAfterOld('Australia/Melbourne'), '2010-05-12');
        assert.equal(dayAfterOld('America/Los_Angeles'), '2010-05-12');
        const india = dayAfterOld('Asia/Kolkata');
        assert.equal(india, '2010-05-12'); // 18:30Z previous day is 04:30 Melbourne the 12th - still correct
        // Only zones ahead of Melbourne cross midnight; assert the failure so the fix is proven to matter.
        const auckland = dayAfterOld('Pacific/Auckland');
        const fiji = dayAfterOld('Pacific/Fiji');
        assert.equal(auckland, '2010-05-11');
        assert.equal(fiji, '2010-05-11');
    });
});
