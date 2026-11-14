/**
 * In-memory stand-in for the Prisma client, covering only the calls the teacher duplicate / signup code makes.
 * It is NOT a database: it exists so the real service code can be tested without touching any database.
 *
 * Behaviour worth knowing:
 *  - $transaction snapshots the data and restores it if the callback throws (like a rollback).
 *  - $executeRaw`SELECT pg_advisory_xact_lock(...)` takes a per-key lock held until the transaction ends
 *    (pass { locks: false } to simulate "no lock" and show the race the lock prevents).
 *  - Unique email on teacher details and logins raises an error with code 'P2002', like Prisma.
 *  - Reads yield to the event loop so concurrent calls genuinely interleave.
 */
export function createFakeDb({ locks = true } = {}) {
    let useLocks = locks;
    const state = { teachers: [], details: [], bank: [], subjects: [], students: [], studentDetails: [], users: [], admins: [], adminDetails: [], wwc: [] };
    const lockTable = new Map();
    let nextId = 1000;
    const hooks = {}; // tests can override a call to simulate a database failure or a hidden row

    const tick = () => new Promise((resolve) => setImmediate(resolve));
    const same = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();
    const copy = (value) => (value === undefined || value === null ? value : structuredClone(value));
    // Like Prisma: P2002 carries the violated field(s) in meta.target.
    const uniqueError = (target = 'email') => Object.assign(new Error(`Unique constraint failed on the fields: (\`${target}\`)`), { code: 'P2002', meta: { target: [target] } });
    const teacherOf = (teacherId) => state.teachers.find((t) => t.id === teacherId);
    const withTeacher = (detail) => ({ ...copy(detail), teacher: { role: teacherOf(detail.teacherId).role, isActive: teacherOf(detail.teacherId).isActive } });
    const emailEquals = (where) => where?.email?.equals;

    const acquire = async (key, held) => {
        if (!useLocks) return;
        while (lockTable.has(key)) await lockTable.get(key).promise;
        let release;
        const promise = new Promise((resolve) => (release = resolve));
        lockTable.set(key, { promise, release });
        held.push(key);
    };
    const releaseAll = (held) => {
        for (const key of held) {
            lockTable.get(key)?.release();
            lockTable.delete(key);
        }
    };

    const createTeacherRows = (data, journal) => {
        const id = nextId++;
        const personal = data.teacherPersonalDetails?.create;
        if (personal && state.details.some((d) => d.email === personal.email)) throw uniqueError('email');
        const wwcNumber = data.teacherWWCHealthInformation?.create?.childrenCheckCardNumber;
        if (wwcNumber !== undefined && state.wwc.some((w) => w.number === wwcNumber)) throw uniqueError('childrenCheckCardNumber');
        state.teachers.push({ id, role: 'APPLICANT', isActive: false, isAllowedLogin: false });
        if (personal) state.details.push({ teacherId: id, ...copy(personal), DOB: new Date(personal.DOB) });
        if (data.teacherBankDetails?.create) state.bank.push({ teacherId: id, ...copy(data.teacherBankDetails.create) });
        if (wwcNumber !== undefined) state.wwc.push({ teacherId: id, number: wwcNumber });
        journal?.push(() => {
            state.teachers = state.teachers.filter((t) => t.id !== id);
            state.details = state.details.filter((d) => d.teacherId !== id);
            state.bank = state.bank.filter((b) => b.teacherId !== id);
            state.wwc = state.wwc.filter((w) => w.teacherId !== id);
        });
        return { id, role: 'APPLICANT', isActive: false, isAllowedLogin: false };
    };

    const makeDelegates = (journal) => ({
        teacherPersonalDetails: {
            async findMany() {
                await tick();
                if (hooks.teacherDetailsFindMany) return hooks.teacherDetailsFindMany();
                return state.details.map(withTeacher);
            },
            async findUnique({ where }) {
                await tick();
                const found = state.details.find((d) => (where.teacherId !== undefined ? d.teacherId === where.teacherId : d.email === where.email));
                return found ? withTeacher(found) : null;
            },
            async findFirst({ where }) {
                await tick();
                const wanted = where.email?.equals ?? where.email;
                const found = state.details.find(
                    (d) => (where.email?.equals !== undefined ? same(d.email, wanted) : d.email === wanted) && (where.teacherId?.not === undefined || d.teacherId !== where.teacherId.not)
                );
                return found ? withTeacher(found) : null;
            }
        },
        personalDetails: {
            async findMany({ where }) {
                await tick();
                return state.studentDetails.filter((d) => same(d.email, emailEquals(where))).map((d) => ({ ...copy(d), student: { akaalId: state.students.find((s) => s.id === d.studentId)?.akaalId ?? null } }));
            },
            async findFirst({ where }) {
                await tick();
                return state.studentDetails.find((d) => same(d.email, emailEquals(where))) ?? null;
            }
        },
        teacherBankDetails: {
            async findMany() {
                await tick();
                return copy(state.bank);
            },
            async findUnique({ where }) {
                await tick();
                return copy(state.bank.find((b) => b.teacherId === where.teacherId) ?? null);
            }
        },
        teacherSubject: {
            async count({ where }) {
                await tick();
                return state.subjects.filter((s) => s.teacherId === where.teacherId).length;
            }
        },
        user: {
            async findFirst({ where }) {
                await tick();
                const found = state.users.find((u) => {
                    if (where.teacherId !== undefined) return u.teacherId === where.teacherId;
                    if (where.studentId !== undefined) return u.studentId === where.studentId;
                    if (where.id !== undefined) return u.id === where.id;
                    if (where.resetPasswordToken !== undefined) return u.resetPasswordToken === where.resetPasswordToken;
                    return same(u.email, emailEquals(where));
                });
                return found ? copy(found) : null;
            },
            async update({ where, data }) {
                await tick();
                const user = state.users.find((u) => (where.id !== undefined ? u.id === where.id : u.email === where.email));
                const before = copy(user);
                journal?.push(() => Object.assign(state.users.find((u) => u.id === user.id), before));
                Object.assign(user, copy(data));
                return copy(user);
            },
            async findUnique({ where }) {
                await tick();
                if (hooks.userFindUnique) return hooks.userFindUnique(where);
                return copy(state.users.find((u) => u.email === where.email) ?? null);
            },
            async create({ data }) {
                await tick();
                if (hooks.userCreate) return hooks.userCreate(data);
                if (state.users.some((u) => u.email === data.email)) throw uniqueError('email');
                if (data.teacherId != null && state.users.some((u) => u.teacherId === data.teacherId)) throw uniqueError('teacherId'); // User.teacherId is @unique
                const user = { id: nextId++, isActive: true, isEmailVerified: false, adminId: null, studentId: null, teacherId: null, ...copy(data) };
                state.users.push(user);
                journal?.push(() => {
                    state.users = state.users.filter((u) => u.id !== user.id);
                });
                return copy(user);
            }
        },
        teacher: {
            async create({ data }) {
                await tick();
                if (hooks.teacherCreate) return hooks.teacherCreate(data);
                return createTeacherRows(data, journal);
            },
            async update({ where, data }) {
                await tick();
                const teacher = teacherOf(where.id);
                const before = { teacher: copy(teacher), detail: copy(state.details.find((d) => d.teacherId === where.id)) };
                journal?.push(() => {
                    Object.assign(teacherOf(where.id), before.teacher);
                    if (before.detail) Object.assign(state.details.find((d) => d.teacherId === where.id), before.detail);
                });
                for (const key of ['role', 'isActive', 'isAllowedLogin']) if (data[key] !== undefined) teacher[key] = data[key];
                const patch = data.teacherPersonalDetails?.update;
                if (patch) {
                    const detail = state.details.find((d) => d.teacherId === where.id);
                    if (patch.email !== undefined && state.details.some((d) => d.teacherId !== where.id && d.email === patch.email)) throw uniqueError();
                    Object.assign(detail, copy(patch), patch.DOB !== undefined ? { DOB: new Date(patch.DOB) } : {});
                }
                return copy(teacher);
            },
            async findUnique({ where }) {
                await tick();
                const teacher = teacherOf(where.id);
                if (!teacher) return null;
                const detail = state.details.find((d) => d.teacherId === where.id);
                return { ...copy(teacher), teacherPersonalDetails: detail ? { email: detail.email } : null };
            }
        },
        admin: {
            async findUnique({ where }) {
                await tick();
                return copy(state.admins.find((a) => a.id === where.id) ?? null);
            }
        },
        adminPersonalDetails: {
            async findUnique({ where }) {
                await tick();
                return copy(state.adminDetails.find((d) => d.email === where.email) ?? null);
            },
            async findFirst({ where }) {
                await tick();
                return copy(state.adminDetails.find((d) => same(d.email, emailEquals(where))) ?? null);
            }
        },
        student: {
            async findFirst({ where }) {
                await tick();
                const wanted = where.personalDetails?.email?.equals;
                const found = state.students.find(
                    (s) => s.role === where.role && s.isActive === where.isActive && (where.isAllowedLogin === undefined || s.isAllowedLogin === where.isAllowedLogin) && state.studentDetails.some((d) => d.studentId === s.id && same(d.email, wanted))
                );
                return copy(found ?? null);
            },
            async findUnique({ where }) {
                await tick();
                const student = state.students.find((s) => s.id === where.id);
                if (!student) return null;
                const detail = state.studentDetails.find((d) => d.studentId === student.id);
                return { ...copy(student), personalDetails: detail ? { email: detail.email } : null };
            }
        }
    });
    const delegates = makeDelegates(null);

    const db = {
        ...delegates,
        state,
        hooks,
        async $executeRaw(strings, ...values) {
            db.lockLog.push(String(values[0]));
            return 0;
        },
        lockLog: [],
        setLocks(enabled) {
            useLocks = enabled;
        },
        reset() {
            for (const key of Object.keys(state)) state[key] = [];
            db.lockLog.length = 0;
            lockTable.clear();
            for (const key of Object.keys(hooks)) delete hooks[key];
            useLocks = true;
        },
        async $transaction(callback) {
            const journal = [];
            const held = [];
            const tx = {
                ...makeDelegates(journal),
                async $executeRaw(strings, ...values) {
                    const key = String(values[0]);
                    db.lockLog.push(key);
                    await acquire(key, held);
                    return 0;
                }
            };
            try {
                return await callback(tx);
            } catch (error) {
                for (const undo of journal.reverse()) undo(); // roll back only THIS transaction's own writes
                throw error;
            } finally {
                releaseAll(held);
            }
        }
    };
    return db;
}

/* ---------- seed helpers ---------- */
let seedCounter = 1;
export function addTeacher(db, o = {}) {
    const id = o.id ?? 5000 + seedCounter++;
    db.state.teachers.push({ id, role: o.role ?? 'TEACHER', isActive: o.isActive ?? true, isAllowedLogin: o.isAllowedLogin ?? true });
    db.state.details.push({
        teacherId: id,
        firstName: o.firstName ?? 'Test',
        lastName: o.lastName ?? `Teacher${id}`,
        DOB: new Date(o.dob ?? '1990-05-05T00:00:00.000Z'),
        gender: 'female',
        email: o.email ?? `teacher${id}@example.test`,
        contact: o.contact ?? `04${String(10000000 + id).slice(-8)}`,
        address: o.address ?? `${id} Example Street`,
        suburb: 'Clyde North',
        state: 'Victoria',
        country: 'Australia',
        postcode: o.postcode ?? '3978',
        image: null
    });
    if (o.bank) db.state.bank.push({ teacherId: id, BSB: o.bank[0], accountNumber: o.bank[1] });
    if (o.wwc) db.state.wwc.push({ teacherId: id, number: o.wwc });
    if (o.subjects !== false) db.state.subjects.push({ teacherId: id, subjectId: 1 });
    return id;
}
export function addStudent(db, o = {}) {
    const id = o.id ?? 7000 + seedCounter++;
    db.state.students.push({ id, role: o.role ?? 'STUDENT', isActive: o.isActive ?? true, isAllowedLogin: o.isAllowedLogin ?? true, akaalId: o.akaalId ?? id - 6000 });
    db.state.studentDetails.push({ studentId: id, firstName: o.firstName ?? 'Student', lastName: o.lastName ?? 'Example', email: o.email ?? `student${id}@example.test` });
    return id;
}
export function addUser(db, o) {
    db.state.users.push({ id: o.id ?? 9000 + seedCounter++, isActive: true, isEmailVerified: false, adminId: null, studentId: null, teacherId: null, password: 'x', ...o });
}
