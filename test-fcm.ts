/**
 * Run with:  npx ts-node test-fcm.ts
 * Tests that Firebase Admin SDK can reach FCM and deliver to a specific token.
 */
import * as dotenv from 'dotenv';
dotenv.config();

import admin from 'firebase-admin';

// const TOKEN = 'dnlkcGQURZ6wBFTUVJ1Anv:APA91bF4tShTNI3pV73alu8u3SLM_8XO-QmWbafn3T6wfhAK1iLbSRajdJDZvG_6l1IQ_F09-fv_MF9qmnolZgmOf-BOZd2EQIdB54PwmwcHmG90NRQjBnA';
const TOKEN = 'cd7gWyNES0X4qh296cKMlL:APA91bG6JMjDyPEVjdTRO2Ua-d9jc0MLGDvlJwqXkx8V0HMryTi2NnSn88S_xkpYCXGX2u2rUA0ZTJqyu1eL1b-FOVmmngpH0Bs-MPiRg0QSwXcQE_VX-vk';

async function main() {
    const projectId   = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    console.log('--- Firebase env check ---');
    console.log('FIREBASE_PROJECT_ID  :', projectId);
    console.log('FIREBASE_CLIENT_EMAIL:', clientEmail);
    console.log('FIREBASE_PRIVATE_KEY :', privateKey
        ? `present (${privateKey.length} chars, hasBegin=${privateKey.includes('-----BEGIN PRIVATE KEY-----')}, hasEnd=${privateKey.includes('-----END PRIVATE KEY-----')})`
        : 'MISSING');

    if (!projectId || !clientEmail || !privateKey) {
        console.error('ERROR: Missing env vars — fix .env and retry.');
        process.exit(1);
    }

    admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey })
    });

    console.log('\n--- Sending test notification ---');
    console.log('Token:', TOKEN.slice(0, 20) + '...');

    try {
        const result = await admin.messaging().send({
            token: TOKEN,
            notification: {
                title: 'Test Notification',
                body:  'Firebase Admin SDK is working correctly!'
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'slms_high_importance',
                    sound: 'default'
                }
            }
        });

        console.log('\nSUCCESS — FCM message ID:', result);
        console.log('If the device did not receive it, check:');
        console.log('  1. App is installed and has notification permission');
        console.log('  2. flutter_local_notifications channel is created (open app once first)');
    } catch (err: any) {
        console.error('\nFAILED — FCM error code:', err?.errorInfo?.code);
        console.error('Full error:', err?.message ?? err);
        console.error('\nCommon causes:');
        console.error('  messaging/invalid-registration-token  → token is stale, re-login the app');
        console.error('  messaging/registration-token-not-registered → app was uninstalled or FCM token expired');
        console.error('  messaging/sender-id-mismatch → google-services.json project doesn\'t match backend credentials');
        console.error('  HttpError 403 → Cloud Messaging API not enabled in Google Cloud Console');
        console.error('  HttpError 401 → Service account credentials are wrong');
    }

    process.exit(0);
}

main();
