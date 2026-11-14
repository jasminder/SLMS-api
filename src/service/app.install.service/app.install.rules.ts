/**
 * App install tracking rules (Scope of Work item 25). Pure and import-free so they can be unit-tested without a database.
 *
 * The app tells the server what it is with three request headers (sent by every app build from 1.0.0+63):
 *   x-app-platform  "ios" or "android"
 *   x-app-version   for example "1.0.0"
 *   x-app-build     for example "63"
 * An OLDER app sends none of them. Those requests are still recognised as the app from the Dart user agent and recorded with
 * platform "app" (platform unknown). Anything else is the website and is recorded as "web".
 */
export type AppPlatform = 'ios' | 'android' | 'app' | 'web';
export type AppContext = { platform: AppPlatform; appVersion: string | null; appBuild: number | null };
export type AppEvent = 'login' | 'seen' | 'open' | 'token' | 'logout';

/** "Last seen" is written at most once an hour per account and platform, so the database is not hit on every request. */
export const SEEN_THROTTLE_MS = 60 * 60 * 1000;

type Headers = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function readAppContext(headers: Headers): AppContext {
    const declared = (first(headers['x-app-platform']) ?? '').trim().toLowerCase();
    const userAgent = first(headers['user-agent']) ?? '';
    let platform: AppPlatform;
    if (declared === 'ios' || declared === 'android') platform = declared;
    else if (/^Dart\//i.test(userAgent)) platform = 'app';
    else platform = 'web';

    if (platform === 'web') return { platform, appVersion: null, appBuild: null };

    const version = (first(headers['x-app-version']) ?? '').trim().slice(0, 32);
    const buildText = (first(headers['x-app-build']) ?? '').trim();
    const build = /^\d{1,9}$/.test(buildText) ? Number(buildText) : null;
    return { platform, appVersion: version || null, appBuild: build };
}

export const isAppPlatform = (platform: string) => platform !== 'web';

export function shouldRecordSeen(lastRecordedMs: number | undefined, nowMs: number): boolean {
    return lastRecordedMs === undefined || nowMs - lastRecordedMs >= SEEN_THROTTLE_MS;
}

/** The platform to show for an account that has more than one row: a known platform wins over "app" (unknown). */
export function bestAppPlatform(platforms: readonly string[]): 'ios' | 'android' | 'app' | null {
    if (platforms.includes('ios')) return 'ios';
    if (platforms.includes('android')) return 'android';
    if (platforms.includes('app')) return 'app';
    return null;
}
