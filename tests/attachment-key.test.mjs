/**
 * Issue 12, Bug B: the stored name of a homework / classwork attachment.
 *
 *  1. the extension rule (attachment.key.rules.ts)
 *  2. the REAL server function getHomeWorkPresignedUrl against a stand-in for S3 (nothing is sent to AWS): key shape, content
 *     type, expiry and validation are unchanged; only the extension of the key differs
 *  3. the keys the real function produces, run through the REAL readers of that name: the web file-type label (client helper),
 *     the mobile app's name pattern (read from the Dart source), the daily e-mail's pattern (read from its source), and the web
 *     list parser (copied, with a guard that it still looks the same in both portals)
 *  4. a guard that the service still builds the key, content type and expiry exactly as before
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beforeEach, describe, it } from 'node:test';
import { createLoader } from './helpers/load.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const RULES = 'service/aws.service/aws.homework.fileUpload.service/attachment.key.rules.ts';
const SERVICE = 'service/aws.service/aws.homework.fileUpload.service/aws.homework.fileUpload.service.ts';
process.env.BUCKET_NAME = 'test-bucket';
const load = createLoader([RULES, SERVICE]);
const { attachmentKeyExtension } = await load(RULES);
const { getHomeWorkPresignedUrl } = await load(SERVICE);
const { getFileType } = await import(pathToFileURL(path.join(ROOT, 'SLMS-client/src/helpers/getFileType.ts')).href);

const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

/* ---------- the readers of the stored name ---------- */
// Web lists (Teacher/Homework/Homework.tsx, AdminHomework.tsx, ...): cut at the LAST hyphen, then drop the extension.
const webListName = (key) => {
    const original = key.split('/').pop();
    const lastHyphen = original.lastIndexOf('-');
    if (lastHyphen !== -1) {
        const nameWithExtension = original.substring(0, lastHyphen);
        const lastDot = nameWithExtension.lastIndexOf('.');
        return lastDot !== -1 ? nameWithExtension.substring(0, lastDot) : nameWithExtension;
    }
    const lastDot = original.lastIndexOf('.');
    return lastDot !== -1 ? original.substring(0, lastDot) : original;
};
// Mobile app (homework_screen.dart _fileDisplayName): the pattern is read from the real Dart source.
const dartSource = read('akaalshauni_app/lib/features/homework/screens/homework_screen.dart');
const mobilePattern = /final uuidSuffix = RegExp\(\s*r'([^']+)'/.exec(dartSource)?.[1];
const mobileName = (key) => key.split('/').pop().replace(new RegExp(mobilePattern), '$1');
// Daily e-mail (cron.consolidatedEmail.service.ts extractOriginalFileNameFromS3Url): the regex literal is read from the source.
const cronSource = read('SLMS-api/src/service/cron.service/cron.consolidatedEmail.service/cron.consolidatedEmail.service.ts');
const cronLiteral = /const fileNameMatch = url\.match\(\/(.*)\/([a-z]*)\);/.exec(cronSource);
const cronName = (key) => {
    const m = `https://test-bucket.s3.r.amazonaws.com/${key}`.match(new RegExp(cronLiteral[1], cronLiteral[2]));
    return m ? decodeURIComponent(m[1]) : '';
};

// What the server receives from the browser: fileType arrives percent-encoded (the forms send encodeURIComponent(file.type)).
const make = async (fileName, mime) => {
    const { key } = await getHomeWorkPresignedUrl(fileName, encodeURIComponent(mime));
    return key;
};
// The OLD rule, kept here only to prove these tests detect the bug.
const oldKey = (fileName, mime) => `${fileName}-00000000-0000-4000-8000-000000000000.${mime.split('/')[1]}`;

beforeEach(() => {
    globalThis.__TEST_S3__ = [];
});

describe('extension rule', () => {
    const cases = [
        ['Practice.docx', 'vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
        ['Notes.doc', 'msword', 'doc'],
        ['report.pdf', 'pdf', 'pdf'],
        ['SCAN.PDF', 'pdf', 'pdf'], // lower-cased
        ['photo.JPG', 'jpeg', 'jpg'],
        ['my.notes.v2.docx', 'x', 'docx'], // last dot wins
        ['Lesson-1 Notes.pdf', 'pdf', 'pdf'], // hyphen in the name
        ['ਗੁਰਮੁਖੀ ਅਭਿਆਸ.pdf', 'pdf', 'pdf'], // Gurmukhi name
        ['Clip.avi', 'x-msvideo', 'avi'],
        ['Clip.mkv', 'x-matroska', 'mkv'],
        ['Movie.mov', 'quicktime', 'mov'],
        ['Song.mp3', 'mpeg', 'mp3'],
        ['abcdefghij.a1b2c3d4e5', 'pdf', 'a1b2c3d4e5'], // exactly 10 characters is accepted
        ['x.a', 'pdf', 'a'] // exactly 1 character is accepted
    ];
    for (const [name, subtype, expected] of cases) {
        it(`"${name}" -> .${expected}`, () => assert.equal(attachmentKeyExtension(name, subtype), expected));
    }
    const fallbacks = [
        ['noextension', 'pdf'],
        ['trailingdot.', 'pdf'],
        ['has space.pdf ', 'pdf'], // trailing space: not a plain extension
        ['file.abcdefghijk', 'pdf'], // 11 characters: too long
        ['archive.tar-gz', 'pdf'], // a hyphen is not alphanumeric
        ['weird.p#f', 'pdf'],
        ['', 'pdf'],
        ['name.', 'vnd.openxmlformats-officedocument.wordprocessingml.document']
    ];
    for (const [name, subtype] of fallbacks) {
        it(`"${name}" has no usable extension: keeps the old MIME fallback (${subtype})`, () => assert.equal(attachmentKeyExtension(name, subtype), subtype));
    }
});

describe('real getHomeWorkPresignedUrl: only the extension of the key changed', () => {
    it('Word file: key is "<name>-<id>.docx" (was ".vnd.openxmlformats-officedocument.wordprocessingml.document")', async () => {
        const result = await getHomeWorkPresignedUrl('Practice.docx', encodeURIComponent(WORD));
        assert.match(result.key, new RegExp(`^Practice\\.docx-${UUID.source}\\.docx$`));
        assert.equal(result.uploadUrl, `https://signed.test/${encodeURIComponent(result.key)}`);
    });
    it('the signed request keeps the bucket, the 10-minute expiry and the content type exactly as sent', async () => {
        const { key } = await getHomeWorkPresignedUrl('Practice.docx', encodeURIComponent(WORD));
        assert.equal(globalThis.__TEST_S3__.length, 1);
        assert.deepEqual(globalThis.__TEST_S3__[0], { operation: 'putObject', params: { Bucket: 'test-bucket', Key: key, Expires: 600, ContentType: encodeURIComponent(WORD) } });
    });
    it('a name with no usable extension keeps the old MIME-subtype extension (no regression)', async () => {
        const key = await make('noextension', 'application/pdf');
        assert.match(key, new RegExp(`^noextension-${UUID.source}\\.pdf$`));
    });
    it('two uploads of the same name get different keys (the random id is still added)', async () => {
        const a = await make('Same.pdf', 'application/pdf');
        const b = await make('Same.pdf', 'application/pdf');
        assert.notEqual(a, b);
    });
    it('validation is unchanged: missing name or type, and a type without a subtype, are still rejected with 400', async () => {
        for (const [name, type] of [['', 'application/pdf'], ['a.pdf', ''], ['a.pdf', 'pdf']]) {
            await assert.rejects(() => getHomeWorkPresignedUrl(name, type), (e) => e.statusCode === 400);
        }
        assert.equal(globalThis.__TEST_S3__.length, 0, 'nothing was signed');
    });
    it('a name already percent-encoded by the old admin form still yields the right extension (works with or without Bug A fixed)', async () => {
        const key = await make('Practice%20Sheet.docx', WORD);
        assert.match(key, /\.docx$/);
    });
});

describe('the readers of the stored name, run on the keys the real function now produces', () => {
    const files = [
        // [file name, MIME type, web list name, web label, mobile name, daily e-mail name]
        ['Practice.docx', WORD, 'Practice', 'Word Document', 'Practice.docx', 'Practice.docx'],
        ['Notes.doc', 'application/msword', 'Notes', 'Word Document', 'Notes.doc', 'Notes.doc'],
        ['Lesson-1 Notes.pdf', 'application/pdf', 'Lesson-1 Notes', 'PDF', 'Lesson-1 Notes.pdf', 'Lesson-1 Notes.pdf'],
        ['SCAN.PDF', 'application/pdf', 'SCAN', 'PDF', 'SCAN.PDF', 'SCAN.PDF'],
        ['my.notes.v2.docx', WORD, 'my.notes.v2', 'Word Document', 'my.notes.v2.docx', 'my.notes.v2.docx'],
        ['ਗੁਰਮੁਖੀ ਅਭਿਆਸ.pdf', 'application/pdf', 'ਗੁਰਮੁਖੀ ਅਭਿਆਸ', 'PDF', 'ਗੁਰਮੁਖੀ ਅਭਿਆਸ.pdf', 'ਗੁਰਮੁਖੀ ਅਭਿਆਸ.pdf'],
        ['photo.JPG', 'image/jpeg', 'photo', 'Image', 'photo.JPG', 'photo.JPG'],
        ['Clip.avi', 'video/x-msvideo', 'Clip', 'audio/video', 'Clip.avi', ''], // the daily e-mail only lists image/pdf/doc types (unchanged)
        ['Clip.mkv', 'video/x-matroska', 'Clip', 'audio/video', 'Clip.mkv', ''],
        ['Song.mp3', 'audio/mpeg', 'Song', 'audio/video', 'Song.mp3', ''],
        ['Movie.mov', 'video/quicktime', 'Movie', 'audio/video', 'Movie.mov', '']
    ];
    for (const [name, mime, web, label, mobile, cron] of files) {
        it(`${name}: web list "${web}", label ${label}, mobile "${mobile}", daily e-mail "${cron}", no id left in any of them`, async () => {
            const key = await make(name, mime);
            assert.equal(webListName(key), web);
            assert.equal(getFileType(key), label);
            assert.equal(mobileName(key), mobile);
            assert.equal(cronName(key), cron);
            for (const shown of [webListName(key), mobileName(key), cronName(key)]) assert.doesNotMatch(shown, UUID, 'the random id must not show in a displayed name');
        });
    }
    it('these tests would have caught the bug: with the OLD rule a Word file leaks the id into the web list and the mobile name, is mislabelled, and is blank in the e-mail', () => {
        const key = oldKey('Practice.docx', WORD);
        assert.match(webListName(key), /00000000-0000-4000-8000-000000000000/);
        assert.equal(getFileType(key), 'audio/video');
        assert.match(mobileName(key), /vnd\.openxmlformats/);
        assert.equal(cronName(key), '');
        assert.match(webListName(oldKey('Clip.avi', 'video/x-msvideo')), /00000000-0000-4000-8000-000000000000/);
    });
    it('keys already stored with the OLD rule are untouched by this change: the reader for PDFs and images gives the same answer as before', async () => {
        for (const [name, mime] of [['report.pdf', 'application/pdf'], ['photo.png', 'image/png'], ['pic.jpeg', 'image/jpeg']]) {
            const before = webListName(oldKey(name, mime));
            const after = webListName(await make(name, mime));
            assert.equal(after, before);
        }
    });
    it('limits that existed before and are unchanged: a name with no extension still shows part of the id in the web list', async () => {
        assert.match(webListName(await make('noextension', 'application/pdf')), /noextension-[0-9a-f]{8}/);
    });
    it('the web list parser is still the same code in the teacher and admin portals (guard for the copy used above)', () => {
        for (const file of ['SLMS-client/src/pages/Teacher/Homework/Homework.tsx', 'SLMS-client/src/pages/Admin/Administration/ManageTeacher/Teacher/ViewTeacherDashboard/AdminViewCWHW/AdminHomework/AdminHomework.tsx']) {
            const source = read(file);
            assert.match(source, /originalName\.lastIndexOf\("-"\)/);
            assert.match(source, /nameWithExtension\.lastIndexOf\("\."\)/);
        }
    });
    it('the patterns read from the Dart and cron sources are the ones expected (guard)', () => {
        assert.ok(mobilePattern && /\[a-f0-9\]\{12\}/.test(mobilePattern), 'mobile pattern found');
        assert.ok(cronLiteral && /jpg\|jpeg\|png\|pdf\|doc\|docx/.test(cronLiteral[1]), 'daily e-mail pattern found');
    });
});

describe('service source: everything else is exactly as before (static check)', () => {
    const source = read(`SLMS-api/src/${SERVICE}`);
    it('uses the new rule and no longer takes the extension straight from the MIME type', () => {
        assert.match(source, /import \{ attachmentKeyExtension \} from '\.\/attachment\.key\.rules';/);
        assert.match(source, /const extension = attachmentKeyExtension\(fileName, fileTypeParts\[1\]\);/);
        assert.doesNotMatch(source, /const extension = fileTypeParts\[1\];/);
    });
    it('key format, 10-minute expiry, content type and the signed putObject call are unchanged', () => {
        assert.match(source, /const Key = `\$\{fileName\}-\$\{randomUUID\(\)\}\.\$\{extension\}`;/);
        assert.match(source, /Expires: 600,/);
        assert.match(source, /ContentType: fileType/);
        assert.match(source, /getSignedUrlPromise\('putObject', s3Params\)/);
    });
    it('the image-upload service (profile photos) was not touched', () => {
        const image = read('SLMS-api/src/service/aws.service/aws.image.fileUpload.service/aws.image.fileUpload.service.ts');
        assert.match(image, /const Key = `\$\{randomUUID\(\)\}\.\$\{extension\}`;/);
        assert.doesNotMatch(image, /attachmentKeyExtension/);
    });
});
