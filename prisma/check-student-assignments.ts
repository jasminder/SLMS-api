/**
 * Read-only: dump every StudentClassAssignment (any term) for a given akaalId,
 * newest-changed first, with a small sample of recent ClassAttendance dates.
 *
 * Run: npx ts-node prisma/check-student-assignments.ts <akaalId>
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
    const akaalId = process.argv[2];
    if (!akaalId) {
        console.log('Usage: ts-node prisma/check-student-assignments.ts <akaalId>');
        return;
    }
    const student = await db.student.findFirst({ where: { akaalId: +akaalId }, select: { id: true, akaalId: true } });
    if (!student) {
        console.log(`No student found with akaalId ${akaalId}`);
        return;
    }
    const assignments = await db.studentClassAssignment.findMany({
        where: { studentId: student.id },
        orderBy: { changeDate: 'desc' },
        include: {
            section: true,
            termSubjectLevel: { include: { subject: true, level: true, term: true } },
            classAttendance: { select: { id: true, date: true }, orderBy: { date: 'desc' }, take: 3 }
        }
    });
    console.log(`Student akaalId=${student.akaalId}, internal id=${student.id}`);
    for (const a of assignments) {
        const recent = a.classAttendance.map((c) => c.date.toISOString().slice(0, 10)).join(', ');
        console.log(
            `#${a.id} active=${a.isCurrentlyAssigned} ${a.termSubjectLevel.subject.name}/${a.termSubjectLevel.level.name} ` +
                `term=${a.termSubjectLevel.term?.name} section="${a.section.name}" changed=${a.changeDate.toISOString().slice(0, 10)} ` +
                `recentAttendance=[${recent}]`
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
