/**
 * Read-only: dump SchoolCheckInAttendance rows for a given akaalId, most recent first.
 * Run: npx ts-node prisma/check-checkin-checkout.ts <akaalId> [limit]
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
    const akaalId = process.argv[2];
    const limit = process.argv[3] ? parseInt(process.argv[3]) : 10;
    if (!akaalId) {
        console.log('Usage: ts-node prisma/check-checkin-checkout.ts <akaalId> [limit]');
        return;
    }
    const student = await db.student.findFirst({ where: { akaalId: +akaalId }, select: { id: true, akaalId: true } });
    if (!student) {
        console.log(`No student found with akaalId ${akaalId}`);
        return;
    }
    const rows = await db.schoolCheckInAttendance.findMany({
        where: { studentId: student.id },
        orderBy: { date: 'desc' },
        take: limit,
        include: {
            classAttendance: { select: { id: true, attendanceStatus: true, date: true } }
        }
    });
    console.log(`Student akaalId=${student.akaalId}, internal id=${student.id}`);
    for (const r of rows) {
        console.log(
            `id=${r.id} date=${r.date.toISOString()} checkedIn=${r.checkedIn} isMarked=${r.isMarked} ` +
                `checkInTime=${r.checkInTime?.toISOString() ?? 'null'} checkOutTime=${r.checkOutTime?.toISOString() ?? 'null'} ` +
                `isCheckedOut=${r.isCheckedOut} isOnLeave=${r.isOnLeave} remarks=${JSON.stringify(r.remarks)} ` +
                `classAttendanceCount=${r.classAttendance.length}`
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
