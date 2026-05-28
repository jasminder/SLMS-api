/**
 * Run:  npx ts-node test-all-notifications.ts
 * Sends one test push for every notification type directly to the token below.
 * Check your iPhone — you should receive all 8 notifications.
 */
import * as dotenv from 'dotenv';
dotenv.config();

import admin from 'firebase-admin';

const TOKEN = 'cd7gWyNES0X4qh296cKMlL:APA91bG6JMjDyPEVjdTRO2Ua-d9jc0MLGDvlJwqXkx8V0HMryTi2NnSn88S_xkpYCXGX2u2rUA0ZTJqyu1eL1b-FOVmmngpH0Bs-MPiRg0QSwXcQE_VX-vk';

const TESTS = [
    {
        label: '1. ATTENDANCE — School check-in present',
        title: 'Attendance Update',
        body: 'Your school attendance has been marked as present.'
    },
    {
        label: '2. ATTENDANCE — School check-in absent',
        title: 'Attendance Update',
        body: 'Your school attendance has been marked as absent.'
    },
    {
        label: '3. ATTENDANCE — Class attendance present (Teacher)',
        title: 'Attendance Update',
        body: 'Your class attendance has been marked as present.'
    },
    {
        label: '4. HOMEWORK — New homework posted',
        title: 'New Homework',
        body: 'A new homework has been posted for Gurbani.'
    },
    {
        label: '5. CLASSWORK — New classwork posted',
        title: 'New Classwork',
        body: 'A new classwork has been posted for Gurbani.'
    },
    {
        label: '6. FEEDBACK — Teacher feedback',
        title: 'New Feedback',
        body: 'There is a new feedback from your teacher.'
    },
    {
        label: '7. FEE — New fee invoice',
        title: 'Fee Update',
        body: 'You have a new fee invoiced. Please check your fee details.'
    },
    {
        label: '8. MESSAGE — Admin message',
        title: 'New Message from School',
        body: 'You have received a new message from the school.'
    },
    {
        label: '9. EVENT — New school event',
        title: 'New Event',
        body: 'A new event "Annual Sports Day" has been added.'
    }
];

async function main() {
    const projectId   = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        console.error('Missing Firebase env vars. Check .env file.');
        process.exit(1);
    }

    admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey })
    });

    console.log(`\nSending ${TESTS.length} test notifications to token ...${TOKEN.slice(-10)}\n`);

    for (const test of TESTS) {
        process.stdout.write(`${test.label} ... `);
        try {
            await admin.messaging().send({
                token: TOKEN,
                notification: { title: test.title, body: test.body },
                android: {
                    priority: 'high',
                    notification: { channelId: 'slms_high_importance', sound: 'default' }
                },
                apns: {
                    headers: { 'apns-priority': '10' },
                    payload: { aps: { sound: 'default' } }
                }
            });
            console.log('✓ SENT');
        } catch (err: any) {
            console.log(`✗ FAILED — ${err?.errorInfo?.code ?? err?.message}`);
        }

        // Small delay so notifications arrive clearly separated on device.
        await new Promise(r => setTimeout(r, 800));
    }

    console.log('\nDone. Check your iPhone — you should have received all 9 notifications.');
    console.log('Tell me which ones arrived and which did not.\n');
    process.exit(0);
}

main();
