/**
 * Ingest one student + user for parent panel login.
 * Creates a Student (with PersonalDetails, ParentsDetails, EmergencyContact,
 * HealthInformation, OtherInformation), then a User linked to that student so
 * the parent can log in via the app and see the student in the parent panel.
 *
 * Also creates StudentTermFee for the current term so the student appears in
 * Admin → Students → Active Students list (which requires studentTermFee.some(termId)).
 *
 * The login email is set on PersonalDetails.email (and ParentsDetails.parentEmail).
 * findStudentsByEmail uses PersonalDetails.email, so the same email is used for login.
 *
 * Usage:
 *   npx ts-node prisma/ingest-student-user.ts
 *   npm run ingest-student-user
 *
 * Optional env overrides:
 *   PARENT_EMAIL   - login email (default: parent@example.com)
 *   PARENT_PASSWORD - login password (default: Password123!)
 *   BACKFILL_STUDENT_TERM_FEE=1 - backfill existing active students with no term fee (so they appear in the list)
 */

import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_EMAIL = process.env.PARENT_EMAIL ?? 'wspqateam@gmail.com';
const DEFAULT_PASSWORD = process.env.PARENT_PASSWORD ?? '123456';
const BACKFILL = process.env.BACKFILL_STUDENT_TERM_FEE === '1';

/** Ensure student has StudentTermFee for current term so they appear in Active Students list. */
async function ensureStudentTermFeeForCurrentTerm(studentId: number): Promise<boolean> {
  const term = await prisma.term.findFirst({ where: { currentTerm: true } });
  if (!term) {
    console.warn('No current term found. Student will not appear in Active Students list until a term is set and StudentTermFee is created.');
    return false;
  }
  const tsg = await prisma.termSubjectGroup.findFirst({
    where: { termId: term.id },
  });
  if (!tsg) {
    console.warn('No TermSubjectGroup for current term. Run term setup or seed first. Student will not appear in Active Students list.');
    return false;
  }
  await prisma.studentTermFee.upsert({
    where: {
      studentId_termSubjectGroupId_termId: {
        studentId,
        termSubjectGroupId: tsg.id,
        termId: term.id,
      },
    },
    update: {},
    create: {
      studentId,
      termSubjectGroupId: tsg.id,
      termId: term.id,
    },
  });
  return true;
}

async function backfillStudentTermFees() {
  const term = await prisma.term.findFirst({ where: { currentTerm: true } });
  if (!term) {
    throw new Error('No current term found. Set a current term first.');
  }
  const tsg = await prisma.termSubjectGroup.findFirst({
    where: { termId: term.id },
  });
  if (!tsg) {
    throw new Error('No TermSubjectGroup for current term. Run term setup or seed first.');
  }
  // Students that are active, role STUDENT, and have no StudentTermFee for this term
  const students = await prisma.student.findMany({
    where: {
      role: Role.STUDENT,
      isActive: true,
      studentTermFee: {
        none: { termId: term.id },
      },
    },
    select: { id: true },
  });
  let created = 0;
  for (const s of students) {
    await prisma.studentTermFee.upsert({
      where: {
        studentId_termSubjectGroupId_termId: {
          studentId: s.id,
          termSubjectGroupId: tsg.id,
          termId: term.id,
        },
      },
      update: {},
      create: {
        studentId: s.id,
        termSubjectGroupId: tsg.id,
        termId: term.id,
      },
    });
    created++;
  }
  console.log(`Backfill: added StudentTermFee for current term to ${created} student(s). They should now appear in Active Students list.`);
}

async function main() {
  if (BACKFILL) {
    await backfillStudentTermFees();
    return;
  }

  const email = DEFAULT_EMAIL.trim().toLowerCase();
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Avoid duplicate user
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    console.log(`User already exists for ${email}. Skipping ingest.`);
    return;
  }

  // Create student with all required relations (no enrollments/terms needed for login)
  const student = await prisma.student.create({
    data: {
      role: Role.STUDENT,
      isActive: true,
      isAllowedLogin: true,
      subjectsChosen: ['Punjabi', 'Kirtan'],
      subjectRelated: ['Gurmat'],
      personalDetails: {
        create: {
          firstName: 'Parent',
          lastName: 'Panel',
          DOB: new Date('2012-05-15'),
          gender: 'Other',
          email,
          contact: '0412345678',
          address: '123 School Rd',
          suburb: 'Melbourne',
          state: 'VIC',
          country: 'Australia',
          postcode: '3000',
        },
      },
      parentsDetails: {
        create: {
          fatherName: 'Father Name',
          motherName: 'Mother Name',
          parentEmail: email,
          parentContact: '0412345678',
        },
      },
      emergencyContact: {
        create: {
          contactPerson: 'Emergency Contact',
          contactNumber: '0498765432',
          relationship: 'Guardian',
        },
      },
      healthInformation: {
        create: {
          medicalCondition: 'None',
          allergy: 'None',
        },
      },
      otherInformation: {
        create: {
          otherInfo: 'Ingested for parent panel login',
          declaration: ['I confirm the details are correct'],
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: Role.STUDENT,
      studentId: student.id,
    },
  });

  const addedToTerm = await ensureStudentTermFeeForCurrentTerm(student.id);

  console.log('Ingested student + user for parent panel login.');
  console.log(`  Student id: ${student.id}`);
  console.log(`  Login email: ${email}`);
  console.log(`  Password: ${DEFAULT_PASSWORD}`);
  if (addedToTerm) {
    console.log('  Enrolled in current term: yes (student will appear in Active Students list).');
  } else {
    console.log('  Enrolled in current term: no. Set current term and run with BACKFILL_STUDENT_TERM_FEE=1 to fix.');
  }
  console.log('You can now sign in with this email in the app.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
