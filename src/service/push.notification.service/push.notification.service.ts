import admin from 'firebase-admin';
import { db } from '../../utils/db.server';

let initialized = false;

function initializeFirebaseAdmin() {
    if (initialized || admin.apps.length > 0) {
        initialized = true;
        return;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
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

    const registrationTokens = Array.from(new Set(tokens.map((entry) => entry.token).filter(Boolean)));
    if (registrationTokens.length === 0) {
        return;
    }

    const response = await admin.messaging().sendEachForMulticast({
        tokens: registrationTokens,
        notification: {
            title,
            body
        },
        data
    });

    const invalidTokens: string[] = [];
    response.responses.forEach((result, idx) => {
        if (!result.success) {
            const code = result.error?.code;
            if (code === 'messaging/invalid-registration-token' || code === 'messaging/registration-token-not-registered') {
                invalidTokens.push(registrationTokens[idx]);
            }
        }
    });

    if (invalidTokens.length > 0) {
        await db.deviceToken.deleteMany({
            where: {
                token: { in: invalidTokens }
            }
        });
    }
}
