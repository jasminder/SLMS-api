import type { Request } from 'express';

/**
 * Public base URL of the web app, used to build links in emails. Same rules as the forgot-password flow
 * (CLIENT_URL unless it is a placeholder, then the request host, then a fixed fallback).
 * Kept here so admin actions do not need to import from the auth controller.
 */
const isPlaceholderClientUrl = (value: string): boolean => {
    try {
        const host = new URL(value).hostname.toLowerCase();
        return host.endsWith('.test.org') || host === 'test.org' || host === 'localhost';
    } catch (_) {
        return true;
    }
};

export const resolveClientUrl = (req: Pick<Request, 'get' | 'protocol'>): string => {
    const rawClientUrl = process.env.CLIENT_URL?.trim();
    if (rawClientUrl && !isPlaceholderClientUrl(rawClientUrl)) {
        return rawClientUrl.replace(/\/+$/, '');
    }
    const host = req.get('host');
    if (host) {
        return `${req.protocol}://${host}`.replace(/\/+$/, '');
    }
    return 'https://akaal.wspclients.com';
};
