/**
 * REAL HTTP regression test for the "API shuts down on a bad session" bug.
 *
 * index.ts shuts the whole process down on any unhandled promise rejection. protectRoute and refreshHandler used to let an
 * error from existingAuthUser (deleted user, login still pending password setup, database failure) escape an async callback,
 * which is exactly such a rejection. Here the REAL protectRoute, the REAL refreshHandler and the REAL global error handler run
 * behind a real node:http server and receive real HTTP requests. A test fails if
 *   - any unhandledRejection is raised (that is what would kill the API), or
 *   - a request gets no answer, or the server stops answering the next request.
 * Only the database (in-memory fake) and the jsonwebtoken package (a small stand-in) are test doubles.
 * The same scenarios are exercised against the real Express app + PostgreSQL by tests/integration/session-errors.integration.mjs.
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, beforeEach, describe, it } from 'node:test';
import { createLoader } from './helpers/load.mjs';
import { addTeacher, addUser, createFakeDb } from './helpers/fakeDb.mjs';

process.env.NODE_ENV = 'production'; // prodErrors: operational -> its status + message, anything else -> a generic 500
process.env.SECRET_STR = 'test-access-secret';
process.env.REFRESH_SECRET_STR = 'test-refresh-secret';
const db = createFakeDb();
globalThis.__TEST_DB__ = db;

const load = createLoader(['middleware/protectRoutes.ts', 'controller/auth.controller/auth.controller.ts', 'controller/error.controller/error.controller.ts']);
const { protectRoute } = await load('middleware/protectRoutes.ts');
const { refreshHandler } = await load('controller/auth.controller/auth.controller.ts');
const { globalErrorHandler } = await load('controller/error.controller/error.controller.ts');

const SENTINEL = '!SLMS-PENDING-PASSWORD-SETUP!';
const b64 = (payload) => Buffer.from(JSON.stringify(payload)).toString('base64url');
const token = (payload, secret = process.env.SECRET_STR) => `stub.${b64(payload)}.${secret}`; // the format of the jsonwebtoken stand-in
const access = (email, extra = {}) => token({ email, role: 'TEACHER', id: 1, ...extra });
const refresh = (email, extra = {}) => token({ email, role: 'TEACHER', id: 1, ...extra }, process.env.REFRESH_SECRET_STR);

/* ---- a minimal Express-like adapter around a real node:http server ---- */
const adapt = (req, res) => {
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (body) => {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(body));
        return res;
    };
    res.cookie = (name, value) => res.setHeader('set-cookie', `${name}=${value}`);
    req.cookies = Object.fromEntries((req.headers.cookie ?? '').split(';').filter(Boolean).map((p) => [p.slice(0, p.indexOf('=')).trim(), p.slice(p.indexOf('=') + 1).trim()]));
};
const runChain = (req, res, chain) => {
    const step = (i) => (err) => {
        if (err) return globalErrorHandler(err, req, res, () => undefined);
        chain[i](req, res, step(i + 1));
    };
    step(0)();
};
const rejections = [];
const onRejection = (reason) => rejections.push(reason);
const server = http.createServer((req, res) => {
    adapt(req, res);
    if (req.url === '/protected') return runChain(req, res, [protectRoute, (r, s) => s.status(200).json({ ok: true, email: r.user.email, hasPassword: 'password' in r.user })]);
    if (req.url === '/refresh') return refreshHandler(req, res, (err) => (err ? globalErrorHandler(err, req, res, () => undefined) : undefined));
    res.statusCode = 404;
    res.end();
});
let base;
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
before(async () => {
    process.on('unhandledRejection', onRejection);
    console.error = () => undefined; // the real error handler logs every error it handles
    console.log = () => undefined;
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
    process.off('unhandledRejection', onRejection);
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    await new Promise((resolve) => server.close(resolve));
});
beforeEach(() => {
    db.reset();
    rejections.length = 0;
    addTeacher(db, { id: 30, email: 'active@example.test' });
    addUser(db, { id: 1, email: 'active@example.test', role: 'TEACHER', teacherId: 30, password: 'hashed:secret' });
    addTeacher(db, { id: 31, email: 'family31@example.test' });
    addUser(db, { id: 2, email: 'pending@example.test', role: 'TEACHER', teacherId: 31, password: SENTINEL });
});

const get = async (path, headers = {}) => {
    const res = await fetch(base + path, { headers, signal: AbortSignal.timeout(3000) }); // no answer within 3s = a hang = a failure
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
};
const settle = () => new Promise((resolve) => setTimeout(resolve, 60)); // unhandled rejections surface after the current tick
const serverStillAnswers = async () => {
    const ok = await get('/protected', { authorization: `Bearer ${access('active@example.test')}` });
    assert.equal(ok.status, 200, 'the server must still serve a valid user after the bad request');
};
const noCrash = async () => {
    await settle();
    assert.deepEqual(
        rejections.map((r) => r?.message),
        [],
        'an unhandled promise rejection would have shut the API down (index.ts exits on them)'
    );
};

describe('protected routes (protectRoute)', () => {
    it('valid user: 200, req.user is set and carries no password', async () => {
        const r = await get('/protected', { authorization: `Bearer ${access('active@example.test')}` });
        assert.deepEqual([r.status, r.body.email, r.body.hasPassword], [200, 'active@example.test', false]);
        await noCrash();
    });

    it('a valid token for a user that no longer exists -> 401 "Session expired" and the server keeps running', async () => {
        const r = await get('/protected', { authorization: `Bearer ${access('deleted.user@example.test')}` });
        assert.equal(r.status, 401);
        assert.match(r.body.message, /Session expired/);
        await noCrash();
        await serverStillAnswers();
    });

    it('a valid token for a login still PENDING password setup -> 403 with the clear message and the server keeps running', async () => {
        const r = await get('/protected', { authorization: `Bearer ${access('pending@example.test')}` });
        assert.equal(r.status, 403);
        assert.match(r.body.message, /not ready yet/);
        await noCrash();
        await serverStillAnswers();
    });

    it('the pending check ignores the role claim and letter case in the token', async () => {
        const r = await get('/protected', { authorization: `Bearer ${access('PENDING@Example.test', { role: 'ADMIN' })}` });
        assert.equal(r.status, 403);
        await noCrash();
    });

    it('a database failure during the lookup -> 500 (generic) and the server keeps running', async () => {
        db.hooks.userFindUnique = async () => {
            throw new Error('database is down');
        };
        const r = await get('/protected', { authorization: `Bearer ${access('active@example.test')}` });
        assert.equal(r.status, 500);
        assert.doesNotMatch(JSON.stringify(r.body), /database is down/); // internal detail is not leaked
        await noCrash();
        delete db.hooks.userFindUnique;
        await serverStillAnswers();
    });

    it('expired token, wrong-secret token, garbage token, missing header: unchanged 401 answers', async () => {
        assert.equal((await get('/protected', { authorization: `Bearer ${access('active@example.test', { __expired: true })}` })).status, 401);
        assert.equal((await get('/protected', { authorization: `Bearer ${token({ email: 'active@example.test' }, 'some-other-secret')}` })).status, 401);
        assert.equal((await get('/protected', { authorization: 'Bearer not-a-token' })).status, 401);
        assert.equal((await get('/protected')).status, 401);
        await noCrash();
        await serverStillAnswers();
    });

    it('30 bad-session requests in a row (deleted + pending + db error, concurrent) never take the server down', async () => {
        const bad = [];
        for (let i = 0; i < 10; i++) bad.push(get('/protected', { authorization: `Bearer ${access('deleted.user@example.test')}` }), get('/protected', { authorization: `Bearer ${access('pending@example.test')}` }));
        const results = await Promise.all(bad);
        assert.deepEqual([...new Set(results.map((r) => r.status))].sort(), [401, 403]);
        db.hooks.userFindUnique = async () => {
            throw new Error('database is down');
        };
        const dbDown = await Promise.all(Array.from({ length: 10 }, () => get('/protected', { authorization: `Bearer ${access('active@example.test')}` })));
        assert.ok(dbDown.every((r) => r.status === 500));
        delete db.hooks.userFindUnique;
        await noCrash();
        await serverStillAnswers();
    });
});

describe('token refresh (refreshHandler)', () => {
    const withCookie = (email, extra) => ({ cookie: `refreshToken=${refresh(email, extra)}` });

    it('valid user: 200 with a new access token and a rotated cookie (unchanged behaviour)', async () => {
        const r = await get('/refresh', withCookie('active@example.test'));
        assert.equal(r.status, 200);
        assert.equal(r.body.email, 'active@example.test');
        assert.ok(r.body.accessToken);
        assert.match(r.headers.get('set-cookie') ?? '', /^refreshToken=/);
        await noCrash();
    });

    it('a valid refresh token for a user that no longer exists -> 401 and the server keeps running', async () => {
        const r = await get('/refresh', withCookie('deleted.user@example.test'));
        assert.equal(r.status, 401);
        assert.ok(!r.body.accessToken);
        await noCrash();
        await serverStillAnswers();
    });

    it('a valid refresh token for a login still PENDING setup -> 403, NO access token, and the server keeps running', async () => {
        globalThis.__TEST_JWT__ = [];
        const r = await get('/refresh', withCookie('pending@example.test'));
        assert.equal(r.status, 403);
        assert.ok(!r.body.accessToken);
        assert.deepEqual(globalThis.__TEST_JWT__, [], 'no token of any kind was signed for the pending account');
        await noCrash();
        await serverStillAnswers();
    });

    it('a database failure during refresh -> 500 and the server keeps running', async () => {
        db.hooks.userFindUnique = async () => {
            throw new Error('database is down');
        };
        const r = await get('/refresh', withCookie('active@example.test'));
        assert.equal(r.status, 500);
        await noCrash();
        delete db.hooks.userFindUnique;
        await serverStillAnswers();
    });

    it('no cookie -> 400, invalid/expired refresh token -> 403 (unchanged)', async () => {
        assert.equal((await get('/refresh')).status, 400);
        assert.equal((await get('/refresh', { cookie: `refreshToken=${refresh('active@example.test', { __expired: true })}` })).status, 403);
        assert.equal((await get('/refresh', { cookie: 'refreshToken=garbage' })).status, 403);
        await noCrash();
        await serverStillAnswers();
    });
});
