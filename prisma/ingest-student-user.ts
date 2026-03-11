/**
 * Ingest one student + user for parent panel login.
 * Creates a Student (with PersonalDetails, ParentsDetails, EmergencyContact,
 * HealthInformation, OtherInformation), then a User linked to that student so
 * the parent can log in via the app and see the student in the parent panel.
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
 */

import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_EMAIL = process.env.PARENT_EMAIL ?? 'wspqateam@gmail.com';
const DEFAULT_PASSWORD = process.env.PARENT_PASSWORD ?? '123456';

async function main() {
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

  console.log('Ingested student + user for parent panel login.');
  console.log(`  Student id: ${student.id}`);
  console.log(`  Login email: ${email}`);
  console.log(`  Password: ${DEFAULT_PASSWORD}`);
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
