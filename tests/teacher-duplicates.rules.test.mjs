import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createLoader } from './helpers/load.mjs';

const load = createLoader(['service/teacher.duplicate.service/teacher.duplicate.rules.ts']);
const R = await load('service/teacher.duplicate.service/teacher.duplicate.rules.ts');

describe('normalisation', () => {
    it('emails are trimmed and lowercased', () => {
        assert.equal(R.normalizeEmail('  Rajveer.Kaur@ICloud.com '), 'rajveer.kaur@icloud.com');
        assert.equal(R.normalizeEmail(null), '');
    });
    it('names are trimmed, lowercased and whitespace is collapsed', () => {
        assert.equal(R.normalizeName('  Rajveer   KAUR '), 'rajveer kaur');
        assert.equal(R.fullNameKey('Rajveer ', 'Kaur'), 'rajveer kaur'); // trailing space as on Teacher 83
        assert.equal(R.fullNameKey('Rajveer', '  Kaur'), 'rajveer kaur');
    });
    it('phones compare by digits only', () => {
        assert.equal(R.phonesMatch('0435 920 412', '0435920412'), true);
        assert.equal(R.phonesMatch('', ''), false);
    });
});

describe('DOB is compared as a Melbourne calendar date, never as an exact timestamp', () => {
    // Values validated earlier against real time-zone data (and by the Q0 self-test plan).
    const cases = [
        ['2001-10-15T19:30:00.000Z', '2001-10-16'], // stored on Teachers 83 and 86
        ['2001-10-15T18:30:00.000Z', '2001-10-16'], // stored on Student 5820 (IST midnight)
        ['2001-10-15T14:00:00.000Z', '2001-10-16'], // Melbourne midnight, standard time
        ['2001-10-15T13:59:00.000Z', '2001-10-15'], // one minute earlier: still the 15th
        ['2001-12-15T13:00:00.000Z', '2001-12-16'], // Melbourne midnight, daylight saving
        ['2001-12-15T12:59:00.000Z', '2001-12-15'],
        ['2001-10-16T04:00:00.000Z', '2001-10-16'] // New York midnight
    ];
    for (const [iso, expected] of cases) {
        it(`${iso} -> ${expected}`, () => assert.equal(R.dobDayKey(iso), expected));
    }
    it('accepts Date objects and rejects missing or invalid values', () => {
        assert.equal(R.dobDayKey(new Date('2001-10-15T19:30:00.000Z')), '2001-10-16');
        for (const bad of [null, undefined, '', 'not a date']) assert.equal(R.dobDayKey(bad), null);
    });
    it('the 83/86 timestamps and a different browser time zone give the SAME identity key', () => {
        const a = R.identityKey('Rajveer ', 'Kaur', '2001-10-15T19:30:00.000Z');
        const b = R.identityKey('rajveer', 'KAUR', '2001-10-15T18:30:00.000Z');
        assert.equal(a, b);
        assert.equal(a, 'rajveer kaur|2001-10-16');
    });
    it('same DOB with a different name, or the same name with a different DOB, are different identities', () => {
        assert.notEqual(R.identityKey('Rajveer', 'Kaur', '2001-10-15T19:30:00Z'), R.identityKey('Navjot', 'Kaur', '2001-10-15T19:30:00Z'));
        assert.notEqual(R.identityKey('Lakhwinder', 'Singh', '1986-03-17T19:30:00Z'), R.identityKey('Lakhwinder', 'Singh', '1986-01-01T00:00:00Z'));
        assert.equal(R.identityKey('', 'Kaur', '2001-10-15T19:30:00Z'), null);
    });
});

describe('possible duplicate signals (warning only)', () => {
    const t47 = { firstName: 'Manjit', lastName: 'Singh', DOB: '1978-08-05T14:00:00Z', address: '28 Riverside Drive', postcode: '3977', bankBsb: '083323', bankAccount: '232686881' };
    const t41 = { firstName: 'Xxxx Manjit', lastName: 'Singh xxxx', DOB: '1979-08-04T14:00:00Z', address: '28 Riverside drive', postcode: '3977', bankBsb: '083-323', bankAccount: '232 686 881' };

    it('Teachers 41 and 47: similar name (padding ignored) + same address + same bank account', () => {
        assert.deepEqual(R.possibleDuplicateSignals(t41, t47), ['address', 'bank']);
    });
    it('a similar name with an address OR a bank match alone is still reported with just that signal', () => {
        assert.deepEqual(R.possibleDuplicateSignals({ ...t41, bankAccount: '999999999' }, t47), ['address']);
        assert.deepEqual(R.possibleDuplicateSignals({ ...t41, address: '1 Other Road' }, t47), ['bank']);
    });
    it('an address or bank match WITHOUT a similar name is never a possible duplicate (households, joint accounts)', () => {
        const spouse = { ...t41, firstName: 'Ravneet', lastName: 'Kaur' };
        assert.deepEqual(R.possibleDuplicateSignals(spouse, t47), []);
    });
    it('a similar name with no corroborating signal is not reported', () => {
        assert.deepEqual(R.possibleDuplicateSignals({ ...t41, address: '1 Other Road', bankAccount: '111111111' }, t47), []);
    });
    it('numbered same-name teachers ("Kaur 1" / "Kaur 2") are different', () => {
        const a = { firstName: 'Kulwinder', lastName: 'Kaur 1', DOB: '1966-04-22T00:00:00Z', address: '7 Camdon Gardens', postcode: '3806' };
        const b = { firstName: 'Kulwinder', lastName: 'Kaur 2', DOB: '1986-03-11T00:00:00Z', address: '12 Clara drive', postcode: '3978' };
        assert.deepEqual(R.possibleDuplicateSignals(a, b), []);
    });
    it('exact name + DOB pairs are blocking conflicts, so they are not repeated as possible duplicates', () => {
        const a = { firstName: 'Rajveer', lastName: 'Kaur', DOB: '2001-10-15T19:30:00Z', address: '4 Winter Street', postcode: '3978' };
        assert.deepEqual(R.possibleDuplicateSignals(a, { ...a, firstName: 'Rajveer ' }), []);
    });
    it('placeholder-looking bank values never match', () => {
        assert.equal(R.bankKey('0', '0'), null);
        assert.equal(R.bankKey('Anchgcc', 'Achb'), null);
        assert.equal(R.bankKey('014111', '12345'), null);
    });
});

describe('messages', () => {
    it('public messages are the exact required wording and contain no ids or personal values', () => {
        assert.equal(R.PUBLIC_EMAIL_CONFLICT_MESSAGE, 'This email is already registered. Please use a different email.');
        assert.equal(R.PUBLIC_IDENTITY_CONFLICT_MESSAGE, 'A teacher with these details already exists. Please contact the school office.');
        assert.doesNotMatch(R.PUBLIC_IDENTITY_CONFLICT_MESSAGE + R.PUBLIC_EMAIL_CONFLICT_MESSAGE, /#|\d/);
    });
    it('admin messages name the conflicting teacher ID', () => {
        const message = R.adminConflictMessage([{ kind: 'NAME_DOB', teacherId: 83, status: 'active teacher' }], 'approval');
        assert.match(message, /Teacher #83 \(active teacher\)/);
        assert.match(message, /Approval is blocked\.$/);
        assert.match(R.adminConflictMessage([{ kind: 'EMAIL', teacherId: 7, status: 'inactive teacher' }], 'edit'), /The change was not saved\.$/);
    });
    it('warnings carry ids only and never a bank number, address or phone', () => {
        const warning = R.possibleDuplicateWarning(47, ['address', 'bank']);
        assert.match(warning.message, /Teacher #47/);
        assert.doesNotMatch(warning.message, /\d{6}/);
    });
});

describe('which unique rule a database unique violation broke (Prisma P2002 meta.target)', () => {
    const p2002 = (target) => ({ code: 'P2002', meta: { target } });
    it('recognises the email, the WWC card number, and treats everything else as OTHER (never as an email problem)', () => {
        assert.equal(R.classifyUniqueViolation(p2002(['email'])), 'EMAIL');
        assert.equal(R.classifyUniqueViolation(p2002(['childrenCheckCardNumber'])), 'WWC');
        assert.equal(R.classifyUniqueViolation(p2002('TeacherWWCHealthInformation_childrenCheckCardNumber_key')), 'WWC');
        assert.equal(R.classifyUniqueViolation(p2002('TeacherPersonalDetails_email_key')), 'EMAIL');
        assert.equal(R.classifyUniqueViolation(p2002(['teacherId'])), 'OTHER');
        assert.equal(R.classifyUniqueViolation(p2002(undefined)), 'OTHER');
        assert.equal(R.classifyUniqueViolation({ code: 'P2002' }), 'OTHER');
        assert.equal(R.classifyUniqueViolation(null), 'OTHER');
    });
    it('the three public messages are different', () => {
        assert.equal(new Set([R.PUBLIC_EMAIL_CONFLICT_MESSAGE, R.PUBLIC_IDENTITY_CONFLICT_MESSAGE, R.PUBLIC_WWC_CONFLICT_MESSAGE]).size, 3);
        assert.match(R.PUBLIC_WWC_CONFLICT_MESSAGE, /Working With Children Check/);
        assert.doesNotMatch(R.PUBLIC_WWC_CONFLICT_MESSAGE, /email/i);
    });
});
