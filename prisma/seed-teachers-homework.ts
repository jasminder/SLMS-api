/**
 * Seed teachers for homework creation and assign them to classes so that
 * students in those classes automatically get homework access when teachers create it.
 *
 * Run: npm run seed:teachers-homework
 * Or: npx ts-node prisma/seed-teachers-homework.ts
 *
 * Prerequisites:
 * - Term, subjects, levels, sections, and optionally students with StudentClassAssignment
 *   (e.g. run seed-dummy-data first: npm run seed-dummy-data)
 *
 * Reads teachers from teacherSeedData/transformed_teachers_data.json.
 * Expected format: { "teachers": [ { "name", "email", "password"? } ] }
 * Creates Teacher + required related records (personal, emergency, WWC, etc.) with placeholders.
 * Then assigns each teacher to every class that has students (same termSubjectLevelId + sectionId),
 * so homework created by the teacher for that class is available to those students.
 */

import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const TEACHER_DATA_PATH = path.join(__dirname, '..', 'teacherSeedData', 'transformed_teachers_data.json');

const DEFAULT_PASSWORD = 'TeacherPassword1!';
const PLACEHOLDER = {
  DOB: '1990-01-01T00:00:00.000Z',
  gender: 'Other',
  contact: '0400000000',
  address: '1 School St',
  suburb: 'Melbourne',
  state: 'VIC',
  country: 'Australia',
  postcode: '3000',
  image: '',
  contactPerson: 'Emergency Contact',
  contactNumber: '0400000001',
  relationship: 'Other',
  medicareNumber: 'N/A',
  medicalCondition: 'None',
  childrenCheckCardNumber: 'WWC-SEED-001',
  workingWithChildrenCheckExpiry: '2030-12-31T00:00:00.000Z',
  workingwithChildrenCheckCardPhotoImage: '',
  immigrationStatus: 'Citizen',
  qualification: 'Bachelor',
  experience: '5+ years',
  subjectsChosen: ['kirtan'],
  timeSlotsChosen: ['Sunday'],
  bankAccountName: 'Seed Account',
  BSB: '000-000',
  accountNumber: '00000000',
  ABN: 'NA',
  otherInfo: 'Seeded for homework',
};

type SimpleTeacher = {
  id?: number;
  name: string;
  email: string;
  password?: string;
  role?: string;
};

function parseName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }
  return { firstName: name || 'Teacher', lastName: 'User' };
}

async function ensureTeacher(teacherInput: SimpleTeacher): Promise<number> {
  const email = teacherInput.email.trim().toLowerCase();
  const existing = await prisma.teacherPersonalDetails.findUnique({
    where: { email },
    select: { teacherId: true },
  });
  if (existing) {
    await prisma.teacher.update({
      where: { id: existing.teacherId },
      data: { role: 'TEACHER', isActive: true, isAllowedLogin: true },
    });
    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!existingUser) {
      const password = teacherInput.password || DEFAULT_PASSWORD;
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: { email, password: hashedPassword, role: 'TEACHER', teacherId: existing.teacherId },
      });
    }
    return existing.teacherId;
  }

  const { firstName, lastName } = parseName(teacherInput.name);
  const teacher = await prisma.teacher.create({
    data: {
      role: 'TEACHER',
      isActive: true,
      isAllowedLogin: true,
      teacherPersonalDetails: {
        create: {
          firstName,
          lastName,
          DOB: new Date(PLACEHOLDER.DOB),
          gender: PLACEHOLDER.gender,
          email,
          contact: PLACEHOLDER.contact,
          address: PLACEHOLDER.address,
          suburb: PLACEHOLDER.suburb,
          state: PLACEHOLDER.state,
          country: PLACEHOLDER.country,
          postcode: PLACEHOLDER.postcode,
          image: PLACEHOLDER.image,
        },
      },
      teacherEmergencyContact: {
        create: {
          contactPerson: PLACEHOLDER.contactPerson,
          contactNumber: PLACEHOLDER.contactNumber,
          relationship: PLACEHOLDER.relationship,
        },
      },
      teacherWWCHealthInformation: {
        create: {
          medicareNumber: PLACEHOLDER.medicareNumber,
          medicalCondition: PLACEHOLDER.medicalCondition,
          childrenCheckCardNumber: `${PLACEHOLDER.childrenCheckCardNumber}-${Date.now()}`,
          workingWithChildrenCheckExpiry: new Date(PLACEHOLDER.workingWithChildrenCheckExpiry),
          workingwithChildrenCheckCardPhotoImage: PLACEHOLDER.workingwithChildrenCheckCardPhotoImage,
        },
      },
      teacherWorkRights: {
        create: {
          workRights: true,
          immigrationStatus: PLACEHOLDER.immigrationStatus,
        },
      },
      teacherQualificationAvailability: {
        create: {
          qualification: PLACEHOLDER.qualification,
          experience: PLACEHOLDER.experience,
          subjectsChosen: PLACEHOLDER.subjectsChosen,
          timeSlotsChosen: PLACEHOLDER.timeSlotsChosen,
        },
      },
      teacherBankDetails: {
        create: {
          bankAccountName: PLACEHOLDER.bankAccountName,
          BSB: PLACEHOLDER.BSB,
          accountNumber: PLACEHOLDER.accountNumber,
          ABN: PLACEHOLDER.ABN,
        },
      },
      teacherOtherInformation: {
        create: { otherInfo: PLACEHOLDER.otherInfo },
      },
    },
  });

  const password = teacherInput.password || DEFAULT_PASSWORD;
  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: 'TEACHER',
      teacherId: teacher.id,
    },
  });

  return teacher.id;
}

async function assignTeachersToStudentClasses(teacherIds: number[]): Promise<void> {
  const currentTerm = await prisma.term.findFirst({
    where: { currentTerm: true },
    select: { id: true },
  });
  if (!currentTerm) {
    console.log('No current term found. Skipping teacher class assignment.');
    return;
  }

  const classesWithStudents = await prisma.studentClassAssignment.findMany({
    where: {
      isCurrentlyAssigned: true,
      termSubjectLevel: { termId: currentTerm.id },
      student: { isActive: true, role: 'STUDENT' },
    },
    distinct: ['termSubjectLevelId', 'sectionId'],
    select: {
      termSubjectLevelId: true,
      sectionId: true,
      termSubjectLevel: { select: { subjectId: true } },
    },
  });

  if (classesWithStudents.length === 0) {
    console.log('No classes with active students in current term. Run seed-dummy-data first to create students and class assignments.');
    return;
  }

  for (const teacherId of teacherIds) {
    for (const cls of classesWithStudents) {
      const subjectId = cls.termSubjectLevel.subjectId;

      await prisma.teacherSubject.upsert({
        where: {
          teacherId_subjectId: { teacherId, subjectId },
        },
        create: { teacherId, subjectId },
        update: {},
      });

      await prisma.teacherClassAssignment.upsert({
        where: {
          teacherId_termSubjectLevelId_sectionId: {
            teacherId,
            termSubjectLevelId: cls.termSubjectLevelId,
            sectionId: cls.sectionId,
          },
        },
        create: {
          teacherId,
          termSubjectLevelId: cls.termSubjectLevelId,
          sectionId: cls.sectionId,
        },
        update: {},
      });
    }
  }

  console.log(`Assigned ${teacherIds.length} teacher(s) to ${classesWithStudents.length} class(es). Homework created for those classes will be available to assigned students.`);
}

async function main() {
  console.log('Seeding teachers for homework and assigning to student classes...\n');

  let raw: { teachers?: SimpleTeacher[] };
  try {
    raw = require(TEACHER_DATA_PATH);
  } catch (e) {
    console.error('Could not load', TEACHER_DATA_PATH, '- Create the file with format: { "teachers": [ { "name": "...", "email": "..." } ] }');
    process.exit(1);
  }

  const list = Array.isArray(raw) ? raw : raw?.teachers;
  if (!Array.isArray(list) || list.length === 0) {
    console.error('No teachers array found in JSON. Use { "teachers": [ { "name": "...", "email": "..." } ] }');
    process.exit(1);
  }

  const teacherIds: number[] = [];
  for (const t of list) {
    if (!t?.email) {
      console.warn('Skipping entry with missing email:', t);
      continue;
    }
    const id = await ensureTeacher({
      name: t.name ?? 'Teacher',
      email: t.email,
      password: t.password,
      role: t.role,
    });
    teacherIds.push(id);
  }

  console.log(`Created/updated ${teacherIds.length} teacher(s).`);

  await assignTeachersToStudentClasses(teacherIds);

  console.log('\nDone. Teachers can create homework for their assigned classes; students in those classes will have homework access.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
