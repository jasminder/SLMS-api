/**
 * Link specific students to existing homework (current term).
 * Usage: npx ts-node prisma/link-homework-students.ts [studentId1] [studentId2] ...
 * Example: npx ts-node prisma/link-homework-students.ts 5297 5298
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STUDENT_IDS = [5297, 5298];

async function main() {
  const studentIds = process.argv.slice(2).map((s) => parseInt(s, 10)).filter((n) => !isNaN(n));
  const ids = studentIds.length > 0 ? studentIds : STUDENT_IDS;

  const term = await prisma.term.findFirst({ where: { currentTerm: true }, select: { startDate: true } });
  let homeworks = await prisma.homework.findMany({
    where: term ? { createdAt: { gte: term.startDate } } : undefined,
    select: { id: true, title: true },
  });
  if (homeworks.length === 0) {
    homeworks = await prisma.homework.findMany({ select: { id: true, title: true } });
  }
  if (homeworks.length === 0) {
    console.log('No homework found in database. Run npm run seed:homework first.');
    return;
  }
  console.log(`Linking students [${ids.join(', ')}] to ${homeworks.length} homework item(s)...\n`);

  let linked = 0;
  for (const studentId of ids) {
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
    if (!student) {
      console.warn(`Student ${studentId} not found, skipping.`);
      continue;
    }
    for (const hw of homeworks) {
      const existing = await prisma.studentHomework.findUnique({
        where: { studentId_homeworkId: { studentId, homeworkId: hw.id } },
      });
      if (existing) continue;
      const sendDate = new Date();
      sendDate.setHours(10, 0, 0, 0);
      await prisma.studentHomework.create({
        data: {
          studentId,
          homeworkId: hw.id,
          attachments: [],
          createdAt: sendDate,
          updatedAt: sendDate,
          sendDate,
        },
      });
      linked++;
      console.log(`  Linked student ${studentId} → "${hw.title}"`);
    }
  }
  console.log(`\nDone. Created ${linked} student-homework link(s) for students [${ids.join(', ')}].`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
