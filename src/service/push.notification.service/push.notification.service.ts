import admin from 'firebase-admin';
import { db } from '../../utils/db.server';

let initialized = false;

function initializeFirebaseAdmin() {
    if (initialized || admin.apps.length > 0) {
        initialized = true;
        return;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    const missing: string[] = [];
    if (!projectId) missing.push('FIREBASE_PROJECT_ID');
    if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
    if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');

    if (missing.length > 0) {
        console.error(
            `[PushNotification] Firebase Admin not initialized. Missing env: ${missing.join(', ')}`
        );
        return;
    }

    // At this point TypeScript can't infer non-null automatically, so assert explicitly.
    if (!projectId || !clientEmail || !privateKey) return;

    const hasBegin = privateKey.includes('-----BEGIN PRIVATE KEY-----');
    const hasEnd = privateKey.includes('-----END PRIVATE KEY-----');
    if (!hasBegin || !hasEnd) {
        console.error(
            `[PushNotification] FIREBASE_PRIVATE_KEY format looks wrong: hasBegin=${hasBegin} hasEnd=${hasEnd} len=${privateKey.length}`
        );
        return;
    }

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey
        })
    });
    initialized = true;
}

export async function sendPushToStudents(studentIds: number[], title: string, body: string, data?: Record<string, string>) {
    if (studentIds.length === 0) {
        return;
    }

    initializeFirebaseAdmin();
    if (!initialized) {
        console.error(
            `[PushNotification] Firebase Admin init failed; not sending push. studentCount=${studentIds.length}`
        );
        return;
    }

    const tokens = await db.deviceToken.findMany({
        where: {
            studentId: { in: studentIds }
        },
        select: {
            token: true
        }
    });

    // Defensive: remove accidental whitespace/newlines from stored tokens.
    const registrationTokens = Array.from(
        new Set(
            tokens
                .map((entry) => entry.token?.trim())
                .filter((t): t is string => Boolean(t))
        )
    );
    if (registrationTokens.length === 0) {
        return;
    }

    try {
        const response = await admin.messaging().sendEachForMulticast({
            tokens: registrationTokens,
            notification: {
                title,
                body
            },
            data
        });

        console.log(
            `[PushNotification] Sent push. title="${title}" tokens=${registrationTokens.length} success=${response.successCount} failure=${response.failureCount}`
        );

        const invalidTokens: string[] = [];
        response.responses.forEach((result, idx) => {
            if (result.success) return;

            const token = registrationTokens[idx];
            const code = result.error?.code ?? 'unknown';
            const message = result.error?.message ?? '';

            console.error(
                `[PushNotification] Failed delivery for token suffix="${token.slice(Math.max(0, token.length - 6))}". code="${code}" message="${message}"`
            );

            // Only delete tokens when we are confident they are invalid on FCM.
            if (code === 'messaging/invalid-registration-token' || code === 'messaging/registration-token-not-registered') {
                invalidTokens.push(token);
            }
        });

        if (invalidTokens.length > 0) {
            await db.deviceToken.deleteMany({
                where: {
                    token: { in: invalidTokens }
                }
            });
        }
    } catch (err) {
        console.error('[PushNotification] Error sending FCM push:', err);
    }
}
