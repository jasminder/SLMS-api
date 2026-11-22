/**
 * Item 25: who has the app (install, update, platform, build).
 *  1. the rules: what a request says about itself, and the once-an-hour "last seen" limit
 *  2. recording on a small in-memory stand-in database: login, app open, last seen, token, logout, and the build history
 *  3. the admin report, the not-installed list, the release list, and the wiring into login, logout, requests and tokens
 * Nothing here touches a real database.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { createLoader } from './helpers/load.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, '../src');
const RULES = 'service/app.install.service/app.install.rules.ts';
const SERVICE = 'service/app.install.service/app.install.service.ts';
const rules = await createLoader([RULES])(RULES);

describe('what a request says about itself', () => {
    it('an app that sends its platform, version and build', () => {
        assert.deepEqual(rules.readAppContext({ 'x-app-platform': 'iOS', 'x-app-version': '1.0.0', 'x-app-build': '63' }), { platform: 'ios', appVersion: '1.0.0', appBuild: 63 });
        assert.deepEqual(rules.readAppContext({ 'x-app-platform': 'android', 'x-app-build': '64' }), { platform: 'android', appVersion: null, appBuild: 64 });
    });
    it('an OLDER app sends no headers: the Dart user agent still shows it is the app, platform unknown', () => {
        assert.deepEqual(rules.readAppContext({ 'user-agent': 'Dart/3.5 (dart:io)' }), { platform: 'app', appVersion: null, appBuild: null });
    });
    it('a browser is the website', () => {
        assert.deepEqual(rules.readAppContext({ 'user-agent': 'Mozilla/5.0 (Macintosh)' }), { platform: 'web', appVersion: null, appBuild: null });
        assert.deepEqual(rules.readAppContext({}), { platform: 'web', appVersion: null, appBuild: null });
    });
    it('an unknown platform value or a bad build is ignored, never trusted', () => {
        assert.equal(rules.readAppContext({ 'x-app-platform': 'windows', 'user-agent': 'Mozilla/5.0' }).platform, 'web');
        assert.equal(rules.readAppContext({ 'x-app-platform': 'ios', 'x-app-build': 'abc' }).appBuild, null);
        assert.equal(rules.readAppContext({ 'x-app-platform': 'ios', 'x-app-build': '12345678901' }).appBuild, null);
        assert.equal(rules.readAppContext({ 'x-app-platform': 'ios', 'x-app-version': 'x'.repeat(100) }).appVersion.length, 32);
    });
    it('web sends no version or build even if the headers are present', () => {
        assert.equal(rules.readAppContext({ 'user-agent': 'Mozilla/5.0', 'x-app-build': '9' }).appBuild, null);
    });
});

describe('last seen is written at most once an hour', () => {
    const H = 60 * 60 * 1000;
    it('first time: yes. 59 minutes later: no. an hour later: yes', () => {
        assert.equal(rules.shouldRecordSeen(undefined, 1000), true);
        assert.equal(rules.shouldRecordSeen(0, H - 60000), false);
        assert.equal(rules.shouldRecordSeen(0, H), true);
    });
    it('a known platform wins over unknown "app"', () => {
        assert.equal(rules.bestAppPlatform(['app', 'ios']), 'ios');
        assert.equal(rules.bestAppPlatform(['app']), 'app');
        assert.equal(rules.bestAppPlatform(['web']), null);
    });
});

/* ---------- a stand-in database ---------- */
function makeDb() {
    const state = { installs: [], history: [], releases: [], users: [], details: {}, nextId: 1 };
    const matchWhere = (row, where = {}) =>
        Object.entries(where).every(([k, v]) => {
            if (v && typeof v === 'object' && 'not' in v) return row[k] !== v.not;
            if (v && typeof v === 'object' && 'notIn' in v) return !v.notIn.includes(row[k]);
            if (v && typeof v === 'object' && k === 'user') return Object.entries(v).every(([uk, uv]) => state.users.find((u) => u.id === row.userId)?.[uk] === uv);
            return row[k] === v;
        });
    return {
        state,
        appInstall: {
            findUnique: async ({ where }) => state.installs.find((r) => r.userId === where.userId_platform.userId && r.platform === where.userId_platform.platform) ?? null,
            create: async ({ data }) => (state.installs.push({ id: state.nextId++, lastLoginAt: null, lastOpenedAt: null, lastSeenAt: null, lastLogoutAt: null, appVersion: null, appBuild: null, buildFirstSeenAt: null, ...data }), data),
            update: async ({ where, data }) => Object.assign(state.installs.find((r) => r.userId === where.userId_platform.userId && r.platform === where.userId_platform.platform), data),
            findMany: async ({ where }) => state.installs.filter((r) => matchWhere(r, where))
        },
        appVersionHistory: {
            findMany: async ({ where }) => state.history.filter((h) => matchWhere(h, where)),
            upsert: async ({ where, create }) => {
                const k = where.userId_platform_appBuild;
                if (!state.history.find((h) => h.userId === k.userId && h.platform === k.platform && h.appBuild === k.appBuild)) state.history.push(create);
            }
        },
        appRelease: {
            findMany: async () => [...state.releases].sort((a, b) => new Date(b.releasedAt) - new Date(a.releasedAt)),
            findUnique: async ({ where }) => state.releases.find((r) => r.platform === where.platform_build.platform && r.build === where.platform_build.build) ?? null,
            create: async ({ data }) => (state.releases.push({ id: state.nextId++, ...data }), data)
        },
        personalDetails: { findUnique: async ({ where }) => (state.details[where.studentId] ? { email: state.details[where.studentId] } : null) },
        student: { findUnique: async ({ where }) => ({ akaalId: 5000 + where.id }) },
        user: {
            count: async ({ where }) => state.users.filter((u) => u.role === where.role).length,
            findFirst: async ({ where }) =>
                (where.email
                    ? state.users.find((u) => u.role === where.role && u.email.toLowerCase() === where.email.equals.toLowerCase())
                    : state.users.find((u) => u.studentId === where.studentId)) ?? null,
            findMany: async ({ where }) =>
                state.users
                    .filter((u) => u.role === where.role && !where.id.notIn.includes(u.id) && u.studentId !== null)
                    .map((u) => ({ ...u, student: { akaalId: 5000 + u.id, isActive: true, personalDetails: { firstName: 'A', lastName: String(u.id) } }, appInstalls: state.installs.filter((i) => i.userId === u.id && i.platform === 'web').map((i) => ({ lastLoginAt: i.lastLoginAt })) }))
        }
    };
}
const load = async (db) => {
    globalThis.__TEST_DB__ = db;
    return createLoader([SERVICE, RULES])(SERVICE);
};
const T = (n) => new Date(Date.UTC(2026, 10, n, 9, 0, 0));
const ctx = (platform, appBuild = null, appVersion = appBuild ? '1.0.0' : null) => ({ platform, appVersion, appBuild });

describe('recording', () => {
    it('login creates the install with first seen, last login and last seen, and the build and its history', async () => {
        const db = makeDb();
        const svc = await load(db);
        await svc.recordAppActivity(1, ctx('ios', 63), 'login', T(14));
        const row = db.state.installs[0];
        assert.equal(row.platform, 'ios');
        assert.deepEqual([row.firstSeenAt, row.lastLoginAt, row.lastSeenAt, row.appBuild, row.buildFirstSeenAt], [T(14), T(14), T(14), 63, T(14)]);
        assert.equal(db.state.history.length, 1);
    });
    it('app open, token and last seen update their own times and keep the first seen date', async () => {
        const db = makeDb();
        const svc = await load(db);
        await svc.recordAppActivity(1, ctx('android', 63), 'login', T(14));
        await svc.recordAppActivity(1, ctx('android', 63), 'open', T(15));
        await svc.recordAppActivity(1, ctx('android', 63), 'seen', T(16));
        const row = db.state.installs[0];
        assert.deepEqual([row.firstSeenAt, row.lastLoginAt, row.lastOpenedAt, row.lastSeenAt], [T(14), T(14), T(15), T(16)]);
        assert.equal(db.state.installs.length, 1);
        assert.equal(db.state.history.length, 1, 'the same build is not written to the history twice');
    });
    it('updating to a newer build is recorded: the build changes and the history gets one new row with its date', async () => {
        const db = makeDb();
        const svc = await load(db);
        await svc.recordAppActivity(1, ctx('ios', 62), 'login', T(10));
        await svc.recordAppActivity(1, ctx('ios', 63), 'open', T(20));
        const row = db.state.installs[0];
        assert.deepEqual([row.appBuild, row.buildFirstSeenAt], [63, T(20)]);
        assert.deepEqual(db.state.history.map((h) => [h.appBuild, h.firstSeenAt]), [[62, T(10)], [63, T(20)]]);
    });
    it('an older app (no build) is still recorded, as platform "app", and never gets a build it did not send', async () => {
        const db = makeDb();
        const svc = await load(db);
        await svc.recordAppActivity(1, ctx('app'), 'login', T(14));
        assert.equal(db.state.installs[0].platform, 'app');
        assert.equal(db.state.installs[0].appBuild, null);
        assert.equal(db.state.history.length, 0);
    });
    it('logout is recorded and the install is kept', async () => {
        const db = makeDb();
        const svc = await load(db);
        await svc.recordAppActivity(1, ctx('ios', 63), 'login', T(14));
        await svc.recordAppActivity(1, ctx('ios', 63), 'logout', T(15));
        assert.equal(db.state.installs.length, 1);
        assert.equal(db.state.installs[0].lastLogoutAt.getTime(), T(15).getTime());
    });
    it('web and app are separate rows for the same account', async () => {
        const db = makeDb();
        const svc = await load(db);
        await svc.recordAppActivity(1, ctx('web'), 'login', T(14));
        await svc.recordAppActivity(1, ctx('ios', 63), 'login', T(14));
        assert.deepEqual(db.state.installs.map((r) => r.platform).sort(), ['ios', 'web']);
    });
    it('trackSeen writes once an hour and a recording failure never throws', async () => {
        const db = makeDb();
        const svc = await load(db);
        svc.resetSeenThrottleForTests();
        svc.trackSeen(5, ctx('ios', 63), 1000);
        svc.trackSeen(5, ctx('ios', 63), 2000);
        await new Promise((r) => setTimeout(r, 20));
        assert.equal(db.state.installs.length, 1);
        db.appInstall.findUnique = async () => {
            throw new Error('database down');
        };
        await svc.recordAppActivitySafely(5, ctx('ios', 63), 'seen'); // must not throw
        await svc.recordAppActivitySafely(undefined, ctx('ios', 63), 'seen');
    });
});

describe('the report, the not-installed list, the profile record and the release list', () => {
    const setup = async () => {
        const db = makeDb();
        db.state.users = [1, 2, 3, 4, 5].map((id) => ({ id, role: 'STUDENT', studentId: 100 + id, email: `p${id}@example.test` }));
        const svc = await load(db);
        await svc.recordAppActivity(1, ctx('ios', 63), 'login', T(14)); // ios, latest
        await svc.recordAppActivity(2, ctx('android', 62), 'login', T(13)); // android, old build
        await svc.recordAppActivity(3, ctx('app'), 'login', T(12)); // older app, platform unknown
        await svc.recordAppActivity(4, ctx('web'), 'login', T(11)); // website only
        db.state.users.push({ id: 9, role: 'TEACHER', studentId: null, email: 't@example.test' });
        return { db, svc };
    };
    it('counts installed against not installed, split by iOS, Android and unknown, and web-only separately', async () => {
        const { svc } = await setup();
        const r = await svc.getInstallReport();
        assert.equal(r.registeredAccounts, 5);
        assert.deepEqual(r.installed, { total: 3, ios: 1, android: 1, unknownPlatform: 1 });
        assert.equal(r.notInstalled, 2);
        assert.equal(r.webOnly, 1);
    });
    it('shows how many are on each build, and marks the latest release', async () => {
        const { svc } = await setup();
        await svc.addRelease({ platform: 'ios', version: '1.0.0', build: 63, releasedAt: '2026-11-10' });
        await svc.addRelease({ platform: 'android', version: '1.0.0', build: 63, releasedAt: '2026-11-10' });
        const r = await svc.getInstallReport();
        assert.deepEqual(r.latestBuild, { ios: 63, android: 63 });
        const ios = r.versions.find((v) => v.platform === 'ios' && v.appBuild === 63);
        const android = r.versions.find((v) => v.platform === 'android' && v.appBuild === 62);
        assert.equal(ios.isLatest, true);
        assert.equal(android.isLatest, false);
    });
    it('the not-installed list is the accounts with no app row, with the last website login when there is one', async () => {
        const { svc } = await setup();
        const list = await svc.getNotInstalledAccounts();
        assert.deepEqual(list.map((a) => a.studentId).sort(), [104, 105]);
        assert.ok(list.find((a) => a.studentId === 104).lastWebLoginAt);
        assert.equal(list.find((a) => a.studentId === 105).lastWebLoginAt, null);
    });
    it('a student profile record shows installs and build history, or says there is no login', async () => {
        const { svc } = await setup();
        const rec = await svc.getStudentAppRecord(101);
        assert.equal(rec.hasLogin, true);
        assert.equal(rec.installs[0].platform, 'ios');
        assert.equal(rec.history.length, 1);
        assert.equal(rec.sharedWithAkaalId, null);
        assert.equal((await svc.getStudentAppRecord(999)).hasLogin, false);
    });
    it('a sibling with no login of their own shows the login on the same email, and says whose it is', async () => {
        const { db, svc } = await setup();
        db.state.details[201] = 'P1@Example.test'; // same email as user 1 (student 101), different case
        const rec = await svc.getStudentAppRecord(201);
        assert.equal(rec.hasLogin, true);
        assert.equal(rec.email, 'p1@example.test');
        assert.equal(rec.sharedWithAkaalId, 5101);
        assert.equal(rec.installs[0].platform, 'ios');
        db.state.details[202] = 'nobody@example.test';
        assert.equal((await svc.getStudentAppRecord(202)).hasLogin, false);
    });
    it('a release needs a valid platform, version, build and date, and a build is listed once', async () => {
        const { svc } = await setup();
        await assert.rejects(() => svc.addRelease({ platform: 'windows', version: '1', build: 1, releasedAt: '2026-11-10' }), /ios or android/);
        await assert.rejects(() => svc.addRelease({ platform: 'ios', version: ' ', build: 1, releasedAt: '2026-11-10' }), /Version is required/);
        await assert.rejects(() => svc.addRelease({ platform: 'ios', version: '1', build: 0, releasedAt: '2026-11-10' }), /Build must be/);
        await assert.rejects(() => svc.addRelease({ platform: 'ios', version: '1', build: 5, releasedAt: 'not a date' }), /valid date/);
        await svc.addRelease({ platform: 'ios', version: '1', build: 5, releasedAt: '2026-11-10' });
        await assert.rejects(() => svc.addRelease({ platform: 'ios', version: '1', build: 5, releasedAt: '2026-11-11' }), /already listed/);
    });
});

describe('wiring', () => {
    const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
    it('every authenticated request is tracked (throttled) from protectRoute', () => {
        const text = read('middleware/protectRoutes.ts');
        assert.match(text, /trackSeen\(existingUser\.id, readAppContext\(req\.headers\)\)/);
    });
    it('login and logout are recorded without being able to fail them', () => {
        const text = read('controller/auth.controller/auth.controller.ts');
        assert.match(text, /await recordAppActivitySafely\(user\?\.id, readAppContext\(req\.headers\), 'login'\)/);
        assert.match(text, /recordAppActivitySafely\(decoded\?\.id, readAppContext\(req\.headers\), 'logout'\)/);
    });
    it('a notification token registration also counts, with the platform the app reported', () => {
        assert.match(read('controller/student.controller/student.dashboard.controller/student.dashboard.controller.ts'), /recordAppActivitySafely\(authUser\?\.id/);
    });
    it('the app-open ping needs a signed-in account, and the admin reads are ADMIN only', () => {
        assert.match(read('route/app.activity.route/app.activity.route.ts'), /route\('\/ping'\)\.post\(\s*protectRoute/);
        const admin = read('route/admin.route/admin.app.install.route/admin.app.install.route.ts');
        for (const p of ['/report', '/installed', '/not-installed', '/student/:studentId', '/releases']) assert.ok(admin.includes(`route('${p}')`));
        assert.equal((admin.match(/restrict\('ADMIN'\)/g) ?? []).length, 6);
        const index = fs.readFileSync(path.join(SRC, '../index.ts'), 'utf8');
        assert.match(index, /app\.use\('\/api\/v1\/admin\/app-installs', adminAppInstallRoute\)/);
        assert.match(index, /app\.use\('\/api\/v1\/app-activity', appActivityRoute\)/);
    });
    it('the migration is additive only and copies the notification tokens into the new table', () => {
        const sql = fs.readFileSync(path.join(SRC, '../prisma/migrations/20261114120000_add_app_install_tracking/migration.sql'), 'utf8');
        assert.equal((sql.match(/CREATE TABLE/g) ?? []).length, 3);
        assert.doesNotMatch(sql, /DROP |ALTER TABLE "(?!AppInstall|AppVersionHistory)/);
        assert.match(sql, /INSERT INTO "AppInstall"[\s\S]*FROM "DeviceToken"/);
        assert.match(sql, /ON CONFLICT \("userId", "platform"\) DO NOTHING/);
    });
});
