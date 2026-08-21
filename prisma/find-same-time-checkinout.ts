/**
 * Read-only: find SchoolCheckInAttendance rows where checkInTime and checkOutTime
 * are identical (down to the millisecond) or within 2 seconds of each other,
 * in roughly the last 3 weeks.
 * Run: npx ts-node prisma/find-same-time-checkinout.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
    const since = new Date();
    since.setDate(since.getDate() - 21);

    const rows = await db.schoolCheckInAttendance.findMany({
        where: {
            checkInTime: { not: null },
            checkOutTime: { not: null },
            date: { gte: since }
        },
        select: {
            id: true,
            date: true,
            checkInTime: true,
            checkOutTime: true,
            student: { select: { akaalId: true, personalDetails: { select: { firstName: true, lastName: true } } } }
        },
        orderBy: { date: 'desc' }
    });

    const suspicious = rows.filter((r) => {
        const diffMs = Math.abs(new Date(r.checkOutTime!).getTime() - new Date(r.checkInTime!).getTime());
        return diffMs <= 2000;
    });

    console.log(`Checked ${rows.length} rows with both checkIn/checkOut set (last 21 days).`);
    console.log(`Found ${suspicious.length} rows where checkIn and checkOut are within 2 seconds of each other:`);
    console.log('='.repeat(80));
    for (const r of suspicious) {
        const name = `${r.student.personalDetails?.firstName ?? ''} ${r.student.personalDetails?.lastName ?? ''}`.trim();
        const diffMs = Math.abs(new Date(r.checkOutTime!).getTime() - new Date(r.checkInTime!).getTime());
        console.log(
            `id=${r.id} student=${name} (ID ${r.student.akaalId}) date=${r.date.toISOString().slice(0, 10)} ` +
                `checkIn=${r.checkInTime!.toISOString()} checkOut=${r.checkOutTime!.toISOString()} diffMs=${diffMs}`
        );
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.$disconnect();
    });
