/**
 * Seed comprehensive dummy data to test all SLMS features.
 *
 * Run: npm run seed-dummy-data   or   npx ts-node prisma/seed-dummy-data.ts
 *
 * Creates:
 * - Current term, subjects (Kirtan, Punjabi, etc.), levels, sections
 * - 10 active students with full details (personal, parents, emergency, health)
 * - Enrollments, StudentTermFee, StudentClassAssignment (Kirtan class)
 * - 5 school days + check-in attendance + class attendance (Kirtan stats: 50%, 70%, etc.)
 * - 2 leave applications (1 PENDING, 1 APPROVED)
 * - 2 student notices (if an admin exists)
 * - 2 events
 */

import { PrismaClient, PaymentType } from '@prisma/client';

const prisma = new PrismaClient();

const SUBJECT_NAMES = ['kirtan', 'punjabi', 'gurmatti', 'gatka', 'gurbaani santhiya'];
const LEVEL_NAME = 'beginner';
const SECTION_NAME = 'Kirtan Section A';
const NUM_STUDENTS = 10;
const PRESENT_PER_DAY = [5, 7, 6, 8, 4];

function pastWeekdays(count: number): Date[] {
  const out: Date[] = [];
  let d = new Date();
  d.setHours(0, 0, 0, 0);
  while (out.length < count) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) out.push(new Date(d));
    d.setDate(d.getDate() - 1);
  }
  return out;
}

async function ensureTermAndSubjects() {
  console.log('1. Ensuring term and subjects...');
  let term = await prisma.term.findFirst({ where: { currentTerm: true } });
  if (!term) {
    term = await prisma.term.findFirst({ where: { isPublish: true } }) ?? await prisma.term.findFirst({ orderBy: { id: 'desc' } });
  }
  if (!term) {
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 6);
    term = await prisma.term.create({
      data: { name: `Term ${start.getFullYear()}`, startDate: start, endDate: end, isPublish: true, currentTerm: true },
    });
  }
  if (!term.currentTerm) {
    await prisma.term.updateMany({ data: { currentTerm: false } });
    term = await prisma.term.update({ where: { id: term.id }, data: { currentTerm: true } });
  }

  const group = await prisma.subjectGroup.findFirst({ where: { groupName: 'main' } }) ?? await prisma.subjectGroup.create({ data: { groupName: 'main' } });
  const fee = await prisma.fee.findFirst({ where: { amount: 100, paymentType: 'TERM' } }) ?? await prisma.fee.create({ data: { amount: 100, paymentType: 'TERM' } });
  const level = await prisma.level.findFirst({ where: { name: LEVEL_NAME } }) ?? await prisma.level.create({ data: { name: LEVEL_NAME } });

  let tsg = await prisma.termSubjectGroup.findUnique({
    where: { termId_subjectGroupId: { termId: term.id, subjectGroupId: group.id } },
  });
  if (!tsg) {
    tsg = await prisma.termSubjectGroup.create({
      data: { termId: term.id, subjectGroupId: group.id, feeId: fee.id },
    });
  }

  for (const name of SUBJECT_NAMES) {
    const sub = await prisma.subject.findFirst({ where: { name } }) ?? await prisma.subject.create({ data: { name } });
    await prisma.termSubjectGroupSubject.upsert({
      where: { termId_subjectGroupId_subjectId: { termId: term.id, subjectGroupId: group.id, subjectId: sub.id } },
      create: { termId: term.id, subjectGroupId: group.id, termSubjectGroupId: tsg.id, subjectId: sub.id },
      update: {},
    });
    await prisma.termSubject.upsert({
      where: { termId_subjectId_termSubjectGroupId: { termId: term.id, subjectId: sub.id, termSubjectGroupId: tsg.id } },
      create: { termId: term.id, subjectId: sub.id, termSubjectGroupId: tsg.id, isOnSunday: true, isOnWeekday: true, level: { connect: { id: level.id } } },
      update: {},
    });
  }

  const kirtanSubject = await prisma.subject.findFirst({ where: { name: 'kirtan' } })!;
  let tsl = await prisma.termSubjectLevel.findFirst({
    where: { termId: term.id, subjectId: kirtanSubject.id },
    include: { sections: { take: 1 } },
  });
  if (!tsl) {
    tsl = await prisma.termSubjectLevel.create({
      data: { termId: term.id, subjectId: kirtanSubject.id, levelId: level.id },
      include: { sections: true },
    });
  }
  let section = tsl.sections[0];
  if (!section) {
    await prisma.section.upsert({
      where: { name: SECTION_NAME },
      update: { termSubjectLevel: { connect: { id: tsl.id } } },
      create: { name: SECTION_NAME, termSubjectLevel: { connect: { id: tsl.id } } },
    });
    section = (await prisma.section.findUnique({ where: { name: SECTION_NAME } }))!;
  }

  const kirtanTermSubject = await prisma.termSubject.findFirst({ where: { termId: term.id, subjectId: kirtanSubject.id } })!;
  return { term, level, tsg, tsl, section, kirtanSubject, kirtanTermSubject };
}

async function createDummyStudents(termStart: Date) {
  console.log('2. Creating dummy students...');
  const dob = new Date('2012-06-15T00:00:00.000Z').toISOString().slice(0, 19) + 'Z';
  const students: number[] = [];
  for (let i = 1; i <= NUM_STUDENTS; i++) {
    const email = `dummy.student${i}@slms.test`;
    const existing = await prisma.student.findFirst({
      where: { personalDetails: { email } },
      select: { id: true },
    });
    if (existing) {
      students.push(existing.id);
      continue;
    }
    const s = await prisma.student.create({
      data: {
        role: 'STUDENT',
        isActive: true,
        isAllowedLogin: true,
        subjectsChosen: ['Kirtan', 'Punjabi'],
        subjectRelated: ['Interest'],
        personalDetails: {
          create: {
            firstName: `Dummy`,
            lastName: `Student${i}`,
            DOB: dob,
            gender: i % 2 === 0 ? 'Female' : 'Male',
            email,
            contact: `04${String(i).padStart(8, '0')}`,
            address: `${i} Test St`,
            suburb: 'Melbourne',
            state: 'VIC',
            country: 'Australia',
            postcode: '3000',
          },
        },
        parentsDetails: {
          create: {
            fatherName: `Parent${i} Father`,
            motherName: `Parent${i} Mother`,
            parentEmail: `parent${i}@slms.test`,
            parentContact: '0400000000',
          },
        },
        emergencyContact: {
          create: {
            contactPerson: `Emergency ${i}`,
            contactNumber: '0400000001',
            relationship: 'Parent',
          },
        },
        healthInformation: {
          create: {
            medicareNumber: 'N/A',
            ambulanceMembershipNumber: 'N/A',
            medicalCondition: 'None',
            allergy: 'None',
          },
        },
        otherInformation: {
          create: { otherInfo: 'Dummy', declaration: ['Agreed'] },
        },
      },
    });
    students.push(s.id);
  }
  return students;
}

async function enrollStudents(
  studentIds: number[],
  termId: number,
  termSubjectGroupId: number,
  kirtanTermSubjectId: number,
  termSubjectLevelId: number,
  sectionId: number
) {
  console.log('3. Enrolling students and assigning to Kirtan class...');
  for (const studentId of studentIds) {
    await prisma.studentTermFee.upsert({
      where: {
        studentId_termSubjectGroupId_termId: { studentId, termSubjectGroupId, termId },
      },
      create: { studentId, termSubjectGroupId, termId },
      update: {},
    });
    let enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        termSubjectGroupId,
        subjectEnrollment: { termSubjectId: kirtanTermSubjectId },
      },
    });
    if (!enrollment) {
      const newEnroll = await prisma.enrollment.create({
        data: { studentId, termSubjectGroupId },
        select: { id: true },
      });
      const subEnroll = await prisma.subjectEnrollment.create({
        data: { enrollmentId: newEnroll.id, termSubjectId: kirtanTermSubjectId },
      });
      await prisma.enrollment.update({
        where: { id: newEnroll.id },
        data: { subjectEnrollmentId: subEnroll.id },
      });
      enrollment = await prisma.enrollment.findUnique({ where: { id: newEnroll.id } })!;
    }
    const exists = await prisma.studentClassAssignment.findFirst({
      where: { studentId, termSubjectLevelId, sectionId, isCurrentlyAssigned: true },
    });
    if (!exists) {
      await prisma.studentClassAssignment.create({
        data: {
          enrollmentId: enrollment.id,
          studentId,
          termSubjectLevelId,
          sectionId,
          isCurrentlyAssigned: true,
        },
      });
    }
  }
}

async function createAttendance(
  studentIds: number[],
  termId: number,
  termStart: Date,
  termSubjectLevelId: number,
  sectionId: number
) {
  console.log('4. Creating school days and Kirtan attendance...');
  const assignments = await prisma.studentClassAssignment.findMany({
    where: {
      termSubjectLevelId,
      sectionId,
      isCurrentlyAssigned: true,
      studentId: { in: studentIds },
    },
    include: { student: { select: { id: true } } },
  });
  const ids = [...new Set(assignments.map((a) => a.studentId))].sort((a, b) => a - b).slice(0, 10);
  const dates = pastWeekdays(5);
  const termStartNorm = new Date(termStart);
  termStartNorm.setHours(0, 0, 0, 0);

  for (let di = 0; di < dates.length; di++) {
    const d = dates[di];
    if (d < termStartNorm) continue;
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const presentCount = Math.min(PRESENT_PER_DAY[di] ?? 5, ids.length);

    let schoolDay = await prisma.schoolDay.findFirst({ where: { schoolOperatedDate: dayStart } });
    if (!schoolDay) {
      schoolDay = await prisma.schoolDay.create({
        data: { schoolOperatedDate: dayStart, isOnWeekday: true, isOnSunday: false },
      });
    }

    for (let si = 0; si < ids.length; si++) {
      const studentId = ids[si];
      const existing = await prisma.schoolCheckInAttendance.findFirst({
        where: {
          studentId,
          date: { gte: dayStart, lte: new Date(dayStart.getTime() + 86400000 - 1) },
        },
      });
      if (existing) continue;

      const checkedIn = si < presentCount;
      const rec = await prisma.schoolCheckInAttendance.create({
        data: {
          studentId,
          date: dayStart,
          schoolDayId: schoolDay!.id,
          attendanceValue: checkedIn ? 1 : 0,
          isOnLeave: false,
          checkedIn,
          isMarked: true,
        },
      });
      const forStudent = assignments.filter((a) => a.studentId === studentId);
      for (const a of forStudent) {
        await prisma.classAttendance.upsert({
          where: {
            studentClassAssignmentId_date: { studentClassAssignmentId: a.id, date: dayStart },
          },
          create: {
            studentClassAssignmentId: a.id,
            date: dayStart,
            schoolCheckInAttendanceId: rec.id,
            attendanceStatus: checkedIn ? 'PRESENT' : 'ABSENT',
            schoolDayId: schoolDay!.id,
            remarks: 'NA',
          },
          update: {},
        });
      }
    }
  }
}

async function createLeaves(studentIds: number[], adminId: number | null) {
  console.log('5. Creating leave applications...');
  const appliedBy = adminId ?? studentIds[0];
  const role = adminId ? 'ADMIN' : 'STUDENT';
  const start1 = new Date();
  start1.setDate(start1.getDate() + 2);
  start1.setHours(0, 0, 0, 0);
  const end1 = new Date(start1);
  end1.setDate(end1.getDate() + 3);
  const start2 = new Date();
  start2.setDate(start2.getDate() + 10);
  start2.setHours(0, 0, 0, 0);
  const end2 = new Date(start2);
  end2.setDate(end2.getDate() + 1);

  const existing1 = await prisma.leave.findFirst({
    where: { studentId: studentIds[0], startDate: start1 },
  });
  if (!existing1) {
    await prisma.leave.create({
      data: {
        studentId: studentIds[0],
        appliedById: appliedBy,
        appliedByRole: role,
        startDate: start1,
        endDate: end1,
        reason: 'Family trip',
        status: 'PENDING',
        comments: 'Dummy leave 1',
      },
    });
  }
  const existing2 = await prisma.leave.findFirst({
    where: { studentId: studentIds[1], startDate: start2 },
  });
  if (!existing2) {
    await prisma.leave.create({
      data: {
        studentId: studentIds[1],
        appliedById: appliedBy,
        appliedByRole: role,
        startDate: start2,
        endDate: end2,
        reason: 'Medical',
        status: 'APPROVED',
        comments: 'Dummy approved leave',
      },
    });
  }
}

async function createNotices(studentIds: number[]) {
  console.log('6. Creating student notices...');
  const admin = await prisma.admin.findFirst({ select: { id: true } });
  if (!admin) {
    console.log('   No admin found – skipping student notices.');
    return;
  }
  const notice1 = await prisma.studentNotice.findFirst({ where: { title: 'Welcome – Dummy Notice' } });
  if (!notice1) {
    const n = await prisma.studentNotice.create({
      data: { adminId: admin.id, title: 'Welcome – Dummy Notice', content: 'This is dummy notice content for testing.' },
    });
    for (const sid of studentIds.slice(0, 5)) {
      await prisma.studentNoticeAcknowledgement.upsert({
        where: { studentNoticeId_studentId: { studentNoticeId: n.id, studentId: sid } },
        create: { studentNoticeId: n.id, studentId: sid, isSeen: false },
        update: {},
      });
    }
  }
  const notice2 = await prisma.studentNotice.findFirst({ where: { title: 'Holiday Reminder' } });
  if (!notice2) {
    const n = await prisma.studentNotice.create({
      data: { adminId: admin.id, title: 'Holiday Reminder', content: 'School closed next Monday. Dummy event notice.' },
    });
    for (const sid of studentIds.slice(0, 3)) {
      await prisma.studentNoticeAcknowledgement.upsert({
        where: { studentNoticeId_studentId: { studentNoticeId: n.id, studentId: sid } },
        create: { studentNoticeId: n.id, studentId: sid, isSeen: true },
        update: {},
      });
    }
  }
}

async function createEvents() {
  console.log('7. Creating events...');
  const events = await prisma.event.findMany({ include: { data: true } });
  const titles = new Set(events.map((e) => e.data?.title).filter(Boolean));

  if (!titles.has('Dummy School Event')) {
    const start = new Date();
    start.setHours(10, 0, 0, 0);
    const end = new Date(start);
    end.setHours(12, 0, 0, 0);
    await prisma.event.create({
      data: {
        start,
        end,
        data: {
          create: {
            title: 'Dummy School Event',
            location: 'Main Hall',
            type: 'assembly',
          },
        },
      },
    });
  }
  if (!titles.has('Parent Meeting')) {
    const start2 = new Date();
    start2.setDate(start2.getDate() + 7);
    start2.setHours(14, 0, 0, 0);
    const end2 = new Date(start2);
    end2.setHours(16, 0, 0, 0);
    await prisma.event.create({
      data: {
        start: start2,
        end: end2,
        data: {
          create: {
            title: 'Parent Meeting',
            location: 'Room 1',
            type: 'meeting',
          },
        },
      },
    });
  }
}

async function main() {
  console.log('Seeding dummy data for all features...\n');
  const { term, tsg, tsl, section, kirtanSubject, kirtanTermSubject } = await ensureTermAndSubjects();
  const studentIds = await createDummyStudents(term.startDate);
  await enrollStudents(
    studentIds,
    term.id,
    tsg.id,
    kirtanTermSubject.id,
    tsl.id,
    section.id
  );
  await createAttendance(studentIds, term.id, term.startDate, tsl.id, section.id);
  const admin = await prisma.admin.findFirst({ select: { id: true } });
  await createLeaves(studentIds, admin?.id ?? null);
  await createNotices(studentIds);
  await createEvents();
  console.log('\nDummy data seed complete. You can now test:');
  console.log('  - Kirtan Stats (Dashboard): 50%, 70%, 60%, 80%, 40%');
  console.log('  - Students, Enrollments, Class assignments');
  console.log('  - Leaves (pending & approved)');
  console.log('  - Student notices (if admin exists)');
  console.log('  - Events');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
