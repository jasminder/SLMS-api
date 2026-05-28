/**
 * Run with:  npx ts-node check-notifications.ts
 * Shows last 10 notifications and last 10 device tokens — lets us see
 * whether check-in notifications are being created in the DB at all,
 * and whether the student IDs in DeviceToken match the ones in Notification.
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function main() {
    console.log('\n=== Last 10 Notifications (newest first) ===');
    const notifications = await db.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
            id: true,
            studentId: true,
            type: true,
            content: true,
            createdAt: true
        }
    });
    if (notifications.length === 0) {
        console.log('No notifications found in DB.');
    } else {
        notifications.forEach(n =>
            console.log(`  id=${n.id}  student=${n.studentId}  type=${n.type}  created=${n.createdAt.toISOString()}`)
        );
    }

    console.log('\n=== Device Tokens (all) ===');
    const tokens = await db.deviceToken.findMany({
        orderBy: { lastSeen: 'desc' },
        select: {
            id: true,
            studentId: true,
            platform: true,
            lastSeen: true,
            token: true
        }
    });
    if (tokens.length === 0) {
        console.log('No device tokens found in DB.');
    } else {
        tokens.forEach(t =>
            console.log(`  tokenId=${t.id}  student=${t.studentId}  platform=${t.platform}  lastSeen=${t.lastSeen.toISOString()}  token=...${t.token.slice(-10)}`)
        );
    }

    console.log('\n=== Cross-check: notifications with NO matching device token ===');
    const tokenStudentIds = new Set(tokens.map(t => t.studentId));
    const notifWithoutToken = notifications.filter(n => !tokenStudentIds.has(n.studentId));
    if (notifWithoutToken.length === 0) {
        console.log('All recent notifications have a matching device token. ✓');
    } else {
        console.log('These notifications were created but had NO device token to push to:');
        notifWithoutToken.forEach(n =>
            console.log(`  id=${n.id}  student=${n.studentId}  type=${n.type}`)
        );
    }

    await db.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
