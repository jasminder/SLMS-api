# Unit tests (no database, no dependencies)

Run: `npm run test:unit` (needs Node 22.6+ with TypeScript type stripping; developed on Node 23).

How it works
- `helpers/load.mjs` copies the REAL TypeScript sources a test needs into a temp folder, swaps the Prisma client / logger for test doubles and stubs third-party packages.
- `helpers/fakeDb.mjs` is an in-memory stand-in for Prisma (transactions with per-transaction rollback, per-key advisory locks, unique-email errors). It is NOT Postgres.

Covered: teacher registration / approval / profile-edit duplicate rules, the public email pre-check, backend controller status codes, DOB calendar-date comparison, possible-duplicate warnings, and signup role resolution (including preserving existing logins).

Not covered: real Postgres behaviour (advisory lock, unique index, `mode: 'insensitive'`), TypeScript compilation, the React client, Flutter. Run `npm run build` and the client `npm run build && npm run lint` separately, and re-test on an isolated database copy before release.
