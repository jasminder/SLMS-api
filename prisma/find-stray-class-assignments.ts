/**
 * Read-only report: finds students who currently have more than one
 * isCurrentlyAssigned=true StudentClassAssignment under the same subject
 * enrollment (the "moved to a new day but old day never deactivated" bug),
 * and lists the ClassAttendance rows generated against the stale one(s).
 *
 * Run: npx ts-node prisma/find-stray-class-assignments.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
    const currentTerm = await db.term.findFirst({ where: { currentTerm: true } });
    if (!currentTerm) {
        console.log('No current term found.');
        return;
    }
    console.log(`Current term: ${currentTerm.name} (id ${currentTerm.id})`);

    const assignments = await db.studentClassAssignment.findMany({
        where: {
            isCurrentlyAssigned: true,
            termSubjectLevel: { termId: currentTerm.id }
        },
        include: {
            student: { include: { personalDetails: true } },
            section: true,
            termSubjectLevel: {
                include: {
                    subject: true,
                    level: true,
                    term: true
                }
            },
            classAttendance: {
                orderBy: { date: 'asc' },
                select: { id: true, date: true, attendanceStatus: true }
            }
        }
    });

    const byEnrollment = new Map<number, typeof assignments>();
    for (const a of assignments) {
        const list = byEnrollment.get(a.enrollmentId) ?? [];
        list.push(a);
        byEnrollment.set(a.enrollmentId, list);
    }

    const affected = [...byEnrollment.values()].filter((list) => list.length > 1);

    console.log(`Total active assignments checked: ${assignments.length}`);
    console.log(`Subject-enrollments with >1 active class assignment: ${affected.length}`);
    console.log('='.repeat(80));

    for (const group of affected) {
        const student = group[0].student;
        const name = `${student.personalDetails?.firstName ?? ''} ${student.personalDetails?.lastName ?? ''}`.trim();
        console.log(`\nStudent: ${name} (ID: ${student.akaalId ?? student.id}, internal id ${student.id})`);
        for (const a of group) {
            console.log(
                `  - Assignment #${a.id}: ${a.termSubjectLevel.subject.name} / ${a.termSubjectLevel.level.name} ` +
                    `(term: ${a.termSubjectLevel.term?.name ?? 'n/a'}), section "${a.section.name}", ` +
                    `changed: ${a.changeDate.toISOString().slice(0, 10)}, ` +
                    `classAttendance rows: ${a.classAttendance.length}` +
                    (a.classAttendance.length
                        ? ` [${a.classAttendance[0].date.toISOString().slice(0, 10)} .. ${a.classAttendance[a.classAttendance.length - 1].date.toISOString().slice(0, 10)}]`
                        : '')
            );
        }
    }

    const totalStrayClassAttendance = affected
        .flatMap((group) => group.slice(1)) // treat the most-recently-changed as "kept", rest as "stray" — informational only
        .reduce((sum, a) => sum + a.classAttendance.length, 0);
    console.log('='.repeat(80));
    console.log(`Informational: if all but the most-recent assignment per enrollment were stale,`);
    console.log(`that's ~${totalStrayClassAttendance} ClassAttendance rows worth investigating.`);
    console.log('(This script makes no changes — no rows were modified or deleted.)');
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.$disconnect();
    });
