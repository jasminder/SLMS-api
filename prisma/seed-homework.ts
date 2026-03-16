/**
 * Seed homework data for testing the homework screen in the mobile app.
 *
 * Run: npm run seed:homework
 * Or: npx ts-node prisma/seed-homework.ts
 *
 * Prerequisites:
 * - Current term, subjects, levels, sections, and students with StudentClassAssignment
 *   (e.g. run first: npm run seed:dummy-data)
 *
 * Creates:
 * - Homework records for the existing class (e.g. Kirtan Section A)
 * - StudentHomework linking each student in that class to the homework
 * - All dates set within current term so they appear in fetch-student-report
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HOMEWORK_ITEMS = [
  {
    title: 'Practice Shabad',
    description: 'Practice Shabad "Dhan Dhan Ram Das Gur" with proper pronunciation and rhythm.',
    attachments: ['shabad_notes.pdf'],
    feedback: null as string | null,
  },
  {
    title: 'Weekly practice',
    description: 'Complete 15 minutes of daily practice and note down the raag for each shabad.',
    attachments: [] as string[],
    feedback: 'Good progress. Keep the rhythm steady.',
  },
  {
    title: 'Chapter 3 exercises',
    description: 'Complete Chapter 3 exercises (ਅਭਿਆਸ) from pages 45-48. Practice writing Gurmukhi letters.',
    attachments: ['punjabi_chapter3.pdf', 'writing_practice.pdf'],
    feedback: 'Good work! Please improve handwriting.',
  },
  {
    title: 'Vocabulary list',
    description: 'Learn the new vocabulary from this week and write each word 5 times in Gurmukhi.',
    attachments: [] as string[],
    feedback: null,
  },
  {
    title: 'Guru Nanak story',
    description: "Read and understand the story of Guru Nanak Dev Ji's childhood. Prepare to discuss in class.",
    attachments: [] as string[],
    feedback: 'Excellent understanding shown.',
  },
];

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(12, 0, 0, 0);
  return d;
}

async function main() {
  console.log('Seeding homework data for mobile app testing...\n');

  const term = await prisma.term.findFirst({ where: { currentTerm: true }, select: { id: true, startDate: true } });
  if (!term) {
    throw new Error('No current term found. Run seed:dummy-data first (npm run seed:dummy-data).');
  }

  const admin = await prisma.admin.findFirst({ select: { id: true } });
  if (!admin) {
    throw new Error('No admin found. Create an admin first (e.g. via seed).');
  }

  const assignment = await prisma.studentClassAssignment.findFirst({
    where: { isCurrentlyAssigned: true },
    include: {
      termSubjectLevel: { include: { subject: { select: { id: true, name: true } } } },
      section: { select: { id: true, name: true } },
    },
  });

  if (!assignment) {
    throw new Error(
      'No student class assignment found. Run seed:dummy-data first to create students and assign them to a class (e.g. Kirtan Section A).'
    );
  }

  const { termSubjectLevelId, sectionId } = assignment;
  const subjectId = assignment.termSubjectLevel.subject.id;
  const subjectName = assignment.termSubjectLevel.subject.name;

  const studentIds = await prisma.studentClassAssignment
    .findMany({
      where: { termSubjectLevelId, sectionId, isCurrentlyAssigned: true },
      select: { studentId: true },
      distinct: ['studentId'],
    })
    .then((rows) => rows.map((r) => r.studentId));

  if (studentIds.length === 0) {
    throw new Error('No students in this class. Run seed:dummy-data first.');
  }

  const termStart = new Date(term.startDate);
  termStart.setHours(0, 0, 0, 0);

  let createdCount = 0;
  let linkedCount = 0;

  for (let i = 0; i < HOMEWORK_ITEMS.length; i++) {
    const item = HOMEWORK_ITEMS[i];
    const createdAt = daysAgo(i + 1);
    if (createdAt < termStart) {
      createdAt.setTime(termStart.getTime() + 86400000 * (i + 1));
    }

    const existing = await prisma.homework.findFirst({
      where: {
        subjectId,
        termSubjectLevelId,
        sectionId,
        description: item.description,
      },
    });
    if (existing) {
      console.log(`  Homework already exists: ${item.title}, skipping.`);
      continue;
    }

    const homework = await prisma.homework.create({
      data: {
        subjectId,
        termSubjectLevelId,
        sectionId,
        adminId: admin.id,
        uploadedUserRole: 'ADMIN',
        title: item.title,
        description: item.description,
        attachments: item.attachments,
        createdAt,
        updatedAt: createdAt,
      },
    });
    createdCount++;

    const sendDate = new Date(createdAt);
    sendDate.setHours(10, 0, 0, 0);

    for (const studentId of studentIds) {
      const existingLink = await prisma.studentHomework.findUnique({
        where: { studentId_homeworkId: { studentId, homeworkId: homework.id } },
      });
      if (existingLink) continue;

      await prisma.studentHomework.create({
        data: {
          studentId,
          homeworkId: homework.id,
          feedback: item.feedback,
          attachments: [],
          createdAt: sendDate,
          updatedAt: sendDate,
          sendDate,
        },
      });
      linkedCount++;
    }

    console.log(`  Created homework: ${item.title} (${subjectName}) → ${studentIds.length} students`);
  }

  console.log(`\nDone. Created ${createdCount} homework record(s), ${linkedCount} student-homework link(s).`);
  console.log(`Class: ${subjectName}, section ID ${sectionId}. Students: ${studentIds.length}.`);
  console.log('Test the homework screen in the app with a user that has access to these students.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
