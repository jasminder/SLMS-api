/**
 * Seed script: adds 5 term subjects to the database.
 * Run from SLMS-api: npx ts-node prisma/seed-term-subjects.ts
 * Or: npm run seed:term-subjects
 *
 * This will:
 * - Use the first existing term, or create a new one and publish it
 * - Create a subject group and fee if needed
 * - Create 5 subjects (Punjabi, Gurmatti, Kirtan, Gatka, Gurbaani Santhiya) and link them to the term as term subjects
 */

import { PrismaClient, PaymentType } from '@prisma/client';

const prisma = new PrismaClient();

const SUBJECT_NAMES = [
  'punjabi',
  'gurmatti',
  'kirtan',
  'gatka',
  'gurbaani santhiya',
];

const LEVEL_NAME = 'beginner';
const SUBJECT_GROUP_NAME = 'main';
const FEE_AMOUNT = 100;
const FEE_TYPE: PaymentType = 'TERM';

async function seedTermSubjects() {
  console.log('Seeding term subjects...');

  // 1. Find or create a term (prefer published)
  let term = await prisma.term.findFirst({
    where: { isPublish: true },
  });
  if (!term) {
    term = await prisma.term.findFirst({ orderBy: { id: 'desc' } });
  }
  if (!term) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 6);
    term = await prisma.term.create({
      data: {
        name: `term-${Date.now()}`,
        startDate,
        endDate,
        isPublish: true,
        currentTerm: true,
      },
    });
    console.log(`Created term: ${term.name} (id: ${term.id}), published.`);
  } else {
    console.log(`Using existing term: ${term.name} (id: ${term.id}).`);
  }

  // 2. Find or create subject group
  let subjectGroup = await prisma.subjectGroup.findUnique({
    where: { groupName: SUBJECT_GROUP_NAME },
  });
  if (!subjectGroup) {
    subjectGroup = await prisma.subjectGroup.create({
      data: { groupName: SUBJECT_GROUP_NAME },
    });
    console.log(`Created subject group: ${subjectGroup.groupName}`);
  }

  // 3. Find or create fee
  let fee = await prisma.fee.findFirst({
    where: { amount: FEE_AMOUNT, paymentType: FEE_TYPE },
  });
  if (!fee) {
    fee = await prisma.fee.create({
      data: { amount: FEE_AMOUNT, paymentType: FEE_TYPE },
    });
    console.log(`Created fee: ${fee.amount} ${fee.paymentType}`);
  }

  // 4. Find or create term subject group for this term + group + fee
  let termSubjectGroup = await prisma.termSubjectGroup.findUnique({
    where: {
      termId_subjectGroupId: {
        termId: term.id,
        subjectGroupId: subjectGroup.id,
      },
    },
  });
  if (!termSubjectGroup) {
    termSubjectGroup = await prisma.termSubjectGroup.create({
      data: {
        termId: term.id,
        subjectGroupId: subjectGroup.id,
        feeId: fee.id,
      },
    });
    console.log(`Created term subject group (id: ${termSubjectGroup.id}).`);
  }

  // 5. Find or create level
  let level = await prisma.level.findUnique({
    where: { name: LEVEL_NAME },
  });
  if (!level) {
    level = await prisma.level.create({
      data: { name: LEVEL_NAME },
    });
    console.log(`Created level: ${level.name}`);
  }

  // 6. For each subject: ensure subject exists, TermSubjectGroupSubject, and TermSubject
  for (const subjectName of SUBJECT_NAMES) {
    let subject = await prisma.subject.findUnique({
      where: { name: subjectName },
    });
    if (!subject) {
      subject = await prisma.subject.create({
        data: { name: subjectName },
      });
      console.log(`  Created subject: ${subject.name}`);
    }

    // TermSubjectGroupSubject (unique on termId, subjectGroupId, subjectId)
    await prisma.termSubjectGroupSubject.upsert({
      where: {
        termId_subjectGroupId_subjectId: {
          termId: term.id,
          subjectGroupId: subjectGroup.id,
          subjectId: subject.id,
        },
      },
      create: {
        termId: term.id,
        subjectGroupId: subjectGroup.id,
        termSubjectGroupId: termSubjectGroup.id,
        subjectId: subject.id,
      },
      update: {
        termSubjectGroupId: termSubjectGroup.id,
      },
    });

    // TermSubject (unique on termId, subjectId, termSubjectGroupId)
    await prisma.termSubject.upsert({
      where: {
        termId_subjectId_termSubjectGroupId: {
          termId: term.id,
          subjectId: subject.id,
          termSubjectGroupId: termSubjectGroup.id,
        },
      },
      create: {
        termId: term.id,
        subjectId: subject.id,
        termSubjectGroupId: termSubjectGroup.id,
        isOnSunday: true,
        isOnWeekday: true,
        level: { connect: { id: level.id } },
      },
      update: {},
    });
    console.log(`  Linked term subject: ${subject.name}`);
  }

  console.log('Done. 5 term subjects seeded.');
}

seedTermSubjects()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
