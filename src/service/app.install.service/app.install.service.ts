import { db } from '../../utils/db.server';
import { customError } from '../../utils/customError';
import type { AppContext, AppEvent } from './app.install.rules';
import { bestAppPlatform, isAppPlatform, shouldRecordSeen } from './app.install.rules';

/**
 * App install tracking (Scope of Work item 25). Recording never breaks the request it rides on: every call here is best effort.
 */
const lastSeenWrite = new Map<string, number>();

export async function recordAppActivity(userId: number, context: AppContext, event: AppEvent, now: Date = new Date()) {
    const timestamps: Record<AppEvent, Record<string, Date>> = {
        login: { lastLoginAt: now, lastSeenAt: now },
        open: { lastOpenedAt: now, lastSeenAt: now },
        seen: { lastSeenAt: now },
        token: { lastSeenAt: now },
        logout: { lastLogoutAt: now }
    };
    const stamp = timestamps[event];
    const key = { userId_platform: { userId, platform: context.platform } };
    const existing = await db.appInstall.findUnique({ where: key });

    const buildChanged = context.appBuild !== null && context.appBuild !== existing?.appBuild;
    const versionFields = buildChanged ? { appVersion: context.appVersion, appBuild: context.appBuild, buildFirstSeenAt: now } : {};

    if (!existing) {
        await db.appInstall.create({ data: { userId, platform: context.platform, firstSeenAt: now, ...stamp, ...versionFields } });
    } else {
        await db.appInstall.update({ where: key, data: { ...stamp, ...versionFields } });
    }

    if (isAppPlatform(context.platform) && context.appBuild !== null) {
        await db.appVersionHistory.upsert({
            where: { userId_platform_appBuild: { userId, platform: context.platform, appBuild: context.appBuild } },
            create: { userId, platform: context.platform, appVersion: context.appVersion, appBuild: context.appBuild, firstSeenAt: now },
            update: {}
        });
    }
}

/** Fire and forget: used on login, logout and the app-open ping. Never throws. */
export async function recordAppActivitySafely(userId: number | undefined, context: AppContext, event: AppEvent) {
    if (!userId) return;
    try {
        await recordAppActivity(userId, context, event);
    } catch (error) {
        console.error('App activity not recorded:', error instanceof Error ? error.message : error);
    }
}

/** Used on every authenticated request: writes "last seen" at most once an hour per account and platform. */
export function trackSeen(userId: number | undefined, context: AppContext, nowMs: number = Date.now()) {
    if (!userId) return;
    const key = `${userId}|${context.platform}`;
    if (!shouldRecordSeen(lastSeenWrite.get(key), nowMs)) return;
    lastSeenWrite.set(key, nowMs);
    void recordAppActivitySafely(userId, context, 'seen');
}
export const resetSeenThrottleForTests = () => lastSeenWrite.clear();

/* ---------------- admin reads ---------------- */

export async function getInstallReport() {
    const [registered, appRows, webRows, releases] = await Promise.all([
        db.user.count({ where: { role: 'STUDENT' } }),
        db.appInstall.findMany({
            where: { platform: { not: 'web' }, user: { role: 'STUDENT' } },
            select: { userId: true, platform: true, appVersion: true, appBuild: true, lastSeenAt: true, lastLoginAt: true }
        }),
        db.appInstall.findMany({ where: { platform: 'web', user: { role: 'STUDENT' } }, select: { userId: true } }),
        db.appRelease.findMany({ orderBy: [{ releasedAt: 'desc' }, { id: 'desc' }] })
    ]);

    const byUser = new Map<number, typeof appRows>();
    for (const row of appRows) byUser.set(row.userId, [...(byUser.get(row.userId) ?? []), row]);

    let ios = 0;
    let android = 0;
    let unknownPlatform = 0;
    for (const rows of byUser.values()) {
        const platform = bestAppPlatform(rows.map((r) => r.platform));
        if (platform === 'ios') ios++;
        else if (platform === 'android') android++;
        else unknownPlatform++;
    }
    const installed = byUser.size;
    const webOnly = new Set(webRows.map((r) => r.userId).filter((id) => !byUser.has(id))).size;

    // users per build, from each account's most recent row per platform
    const versionCounts = new Map<string, { platform: string; appVersion: string | null; appBuild: number | null; users: number }>();
    for (const row of appRows.filter((r) => r.platform === 'ios' || r.platform === 'android')) {
        const k = `${row.platform}|${row.appBuild ?? 'unknown'}`;
        const entry = versionCounts.get(k) ?? { platform: row.platform, appVersion: row.appVersion, appBuild: row.appBuild, users: 0 };
        entry.users++;
        versionCounts.set(k, entry);
    }
    // Latest = the highest build any phone on that platform has reported (or a release row, if one was ever added).
    const latestBuild = (platform: string) =>
        [...releases.filter((r) => r.platform === platform).map((r) => r.build), ...appRows.filter((r) => r.platform === platform && r.appBuild !== null).map((r) => r.appBuild as number)].reduce<number | null>(
            (max, b) => (max === null || b > max ? b : max),
            null
        );
    const versions = [...versionCounts.values()]
        .map((v) => ({ ...v, isLatest: v.appBuild !== null && v.appBuild === latestBuild(v.platform) }))
        .sort((a, b) => a.platform.localeCompare(b.platform) || (b.appBuild ?? -1) - (a.appBuild ?? -1));

    return {
        registeredAccounts: registered,
        installed: { total: installed, ios, android, unknownPlatform },
        notInstalled: Math.max(registered - installed, 0),
        webOnly,
        versions,
        latestBuild: { ios: latestBuild('ios'), android: latestBuild('android') },
        releases
    };
}

export async function getNotInstalledAccounts() {
    const installedUsers = await db.appInstall.findMany({ where: { platform: { not: 'web' } }, select: { userId: true } });
    const installedIds = [...new Set(installedUsers.map((r) => r.userId))];
    const users = await db.user.findMany({
        where: { role: 'STUDENT', id: { notIn: installedIds }, studentId: { not: null } },
        select: {
            id: true,
            email: true,
            studentId: true,
            student: { select: { akaalId: true, isActive: true, personalDetails: { select: { firstName: true, lastName: true } } } },
            appInstalls: { where: { platform: 'web' }, select: { lastLoginAt: true } }
        },
        orderBy: { id: 'asc' }
    });
    return users.map((u) => ({
        studentId: u.studentId,
        akaalId: u.student?.akaalId ?? null,
        name: `${u.student?.personalDetails?.firstName ?? ''} ${u.student?.personalDetails?.lastName ?? ''}`.trim(),
        email: u.email,
        isActive: u.student?.isActive ?? false,
        lastWebLoginAt: u.appInstalls[0]?.lastLoginAt ?? null
    }));
}

/** Every student account that has used the app, with the platform it is counted under on the report tiles (same rule). */
export async function getInstalledAccounts() {
    const users = await db.user.findMany({
        where: { role: 'STUDENT', appInstalls: { some: { platform: { not: 'web' } } } },
        select: {
            email: true,
            studentId: true,
            student: { select: { akaalId: true, isActive: true, personalDetails: { select: { firstName: true, lastName: true } } } },
            appInstalls: { where: { platform: { not: 'web' } }, select: { platform: true, appVersion: true, appBuild: true, lastSeenAt: true, lastLoginAt: true, lastOpenedAt: true } }
        },
        orderBy: { id: 'asc' }
    });
    const latest = (dates: (Date | null)[]) => dates.reduce<Date | null>((max, d) => (d && (!max || d > max) ? d : max), null);
    return users.map((u) => {
        const platform = bestAppPlatform(u.appInstalls.map((r) => r.platform)) ?? 'app';
        const main = u.appInstalls.find((r) => r.platform === platform) ?? u.appInstalls[0];
        return {
            studentId: u.studentId,
            akaalId: u.student?.akaalId ?? null,
            name: `${u.student?.personalDetails?.firstName ?? ''} ${u.student?.personalDetails?.lastName ?? ''}`.trim(),
            email: u.email,
            isActive: u.student?.isActive ?? false,
            platform,
            platforms: [...new Set(u.appInstalls.map((r) => r.platform))].sort(),
            appVersion: main?.appVersion ?? null,
            appBuild: main?.appBuild ?? null,
            lastSeenAt: latest(u.appInstalls.flatMap((r) => [r.lastSeenAt, r.lastLoginAt, r.lastOpenedAt]))
        };
    });
}

export async function getStudentAppRecord(studentId: number) {
    let user: { id: number; email: string; studentId: number | null } | null = await db.user.findFirst({ where: { studentId }, select: { id: true, email: true, studentId: true } });
    // Siblings share one login: the app shows every student whose email matches the login email (getStudentsForApp), but the
    // login is linked to only one of them. Fall back to the login on the same email, and say whose it is.
    let sharedWithAkaalId: number | null = null;
    if (!user) {
        const details = await db.personalDetails.findUnique({ where: { studentId }, select: { email: true } });
        const email = details?.email?.trim();
        if (email) {
            user = await db.user.findFirst({ where: { role: 'STUDENT', email: { equals: email, mode: 'insensitive' } }, select: { id: true, email: true, studentId: true } });
            if (user?.studentId) {
                const owner = await db.student.findUnique({ where: { id: user.studentId }, select: { akaalId: true } });
                sharedWithAkaalId = owner?.akaalId ?? null;
            }
        }
    }
    if (!user) return { hasLogin: false, email: null, sharedWithAkaalId: null, installs: [], history: [] };
    const [installs, history] = await Promise.all([
        db.appInstall.findMany({ where: { userId: user.id }, orderBy: { platform: 'asc' } }),
        db.appVersionHistory.findMany({ where: { userId: user.id }, orderBy: { firstSeenAt: 'desc' } })
    ]);
    return { hasLogin: true, email: user.email, sharedWithAkaalId, installs, history };
}

export async function listReleases() {
    return db.appRelease.findMany({ orderBy: [{ releasedAt: 'desc' }, { id: 'desc' }] });
}

export async function addRelease(input: { platform: string; version: string; build: number; releasedAt: string; notes?: string }) {
    const platform = input.platform.trim().toLowerCase();
    if (platform !== 'ios' && platform !== 'android') throw customError('Platform must be ios or android.', 'fail', 400, true);
    if (!input.version.trim()) throw customError('Version is required.', 'fail', 400, true);
    if (!Number.isInteger(input.build) || input.build <= 0) throw customError('Build must be a whole number above zero.', 'fail', 400, true);
    const releasedAt = new Date(input.releasedAt);
    if (Number.isNaN(releasedAt.getTime())) throw customError('Release date is not a valid date.', 'fail', 400, true);
    const existing = await db.appRelease.findUnique({ where: { platform_build: { platform, build: input.build } } });
    if (existing) throw customError(`Build ${input.build} is already listed for ${platform}.`, 'fail', 409, true);
    return db.appRelease.create({ data: { platform, version: input.version.trim(), build: input.build, releasedAt, notes: input.notes?.trim() || null } });
}
