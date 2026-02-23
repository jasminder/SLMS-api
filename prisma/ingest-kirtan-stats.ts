/**
 * Ingest Kirtan statistics for testing.
 * Creates 5 school days with check-in attendance and class attendance
 * for students assigned to Kirtan, so the Kirtan Stats dashboard shows data.
 *
 * Usage:
 *   npx ts-node prisma/ingest-kirtan-stats.ts
 *   npm run ingest-kirtan-stats
 *
 * Prerequisites:
 *   - Current term exists
 *   - Subject "Kirtan" (or "kirtan") exists with TermSubjectLevel and Section
 *   - At least one active student has StudentClassAssignment for Kirtan
 *
 * --- TABLES & COLUMNS USED FOR KIRTAN STATS (verify in DB) ---
 *
 * 1. SchoolDay
 *    - id, schoolOperatedDate, isOnWeekday, isOnSunday
 *    - Dashboard: last 5 days where schoolOperatedDate <= query date, >= term start
 *
 * 2. SchoolCheckInAttendance (shown as "schoolAttendances" on each SchoolDay)
 *    - id, studentId, date, schoolDayId, checkedIn, isMarked, attendanceValue, isOnLeave
 *    - Expected = count of rows linked to this day + Kirtan class
 *    - Present = count where checkedIn = true
 *    - Absent = count where checkedIn = false
 *
 * 3. ClassAttendance (links check-in to a class)
 *    - id, studentClassAssignmentId, date, schoolCheckInAttendanceId, attendanceStatus, schoolDayId
 *    - Only rows whose studentClassAssignment → termSubjectLevel → subject.name = 'Kirtan' are included
 *
 * 4. StudentClassAssignment
 *    - id, studentId, termSubjectLevelId, sectionId, isCurrentlyAssigned
 *    - Defines which students are in Kirtan class
 *
 * 5. TermSubjectLevel → Subject (name = 'Kirtan')
 *    - Links term + subject + level for Kirtan
 *
 * SQL to spot-check (replace dates/ids as needed):
 *   SELECT sd."schoolOperatedDate", COUNT(scia.id) AS expected,
 *          COUNT(*) FILTER (WHERE scia."checkedIn" = true) AS present,
 *          COUNT(*) FILTER (WHERE scia."checkedIn" = false) AS absent
 *   FROM "SchoolDay" sd
 *   JOIN "SchoolCheckInAttendance" scia ON scia."schoolDayId" = sd.id
 *   JOIN "ClassAttendance" ca ON ca."schoolCheckInAttendanceId" = scia.id
 *   JOIN "StudentClassAssignment" sca ON sca.id = ca."studentClassAssignmentId"
 *   JOIN "TermSubjectLevel" tsl ON tsl.id = sca."termSubjectLevelId"
 *   JOIN "Subject" s ON s.id = tsl."subjectId" AND s.name = 'Kirtan'
 *   GROUP BY sd.id, sd."schoolOperatedDate"
 *   ORDER BY sd."schoolOperatedDate" DESC LIMIT 5;
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NUM_DAYS = 5;
/** Present count per day (oldest to newest) to get sample stats: 50%, 70%, 60%, 80%, 40%. Expected = 10 each. */
const PRESENT_PER_DAY = [5, 7, 6, 8, 4]; // Day 1: 10 expected, 5 present, 5 absent, 50%; Day 2: 10, 7, 3, 70%; etc.
const TARGET_EXPECTED = 10; // Target "Expected students" per day for demo stats

/** Ensures current term has Kirtan TermSubject (and TermSubjectGroup) so enrollment seed can run. */
async function ensureKirtanTermSubjectAndGroup(
  prisma: PrismaClient,
  currentTerm: { id: number },
  subjectId: number,
  levelId: number
): Promise<void> {
  const existing = await prisma.termSubject.findFirst({
    where: { termId: currentTerm.id, subjectId },
  });
  if (existing) return;

  let group = await prisma.subjectGroup.findFirst({ where: { groupName: 'main' } });
  if (!group) {
    group = await prisma.subjectGroup.create({ data: { groupName: 'main' } });
  }

  let feeRow = await prisma.fee.findFirst({ where: { amount: 100, paymentType: 'TERM' } });
  if (!feeRow) {
    feeRow = await prisma.fee.create({ data: { amount: 100, paymentType: 'TERM' } });
  }

  let termSubjectGroup = await prisma.termSubjectGroup.findUnique({
    where: {
      termId_subjectGroupId: { termId: currentTerm.id, subjectGroupId: group.id },
    },
  });
  if (!termSubjectGroup) {
    termSubjectGroup = await prisma.termSubjectGroup.create({
      data: {
        termId: currentTerm.id,
        subjectGroupId: group.id,
        feeId: feeRow.id,
      },
    });
  }

  await prisma.termSubject.upsert({
    where: {
      termId_subjectId_termSubjectGroupId: {
        termId: currentTerm.id,
        subjectId,
        termSubjectGroupId: termSubjectGroup.id,
      },
    },
    create: {
      termId: currentTerm.id,
      subjectId,
      termSubjectGroupId: termSubjectGroup.id,
      isOnSunday: true,
      isOnWeekday: true,
      level: { connect: { id: levelId } },
    },
    update: {},
  });
  console.log('Kirtan TermSubject (and group) created for current term.');
}

function getPastWeekdays(count: number): Date[] {
  const dates: Date[] = [];
  let d = new Date();
  d.setHours(0, 0, 0, 0);
  while (dates.length < count) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) dates.push(new Date(d));
    d.setDate(d.getDate() - 1);
  }
  return dates;
}

/**
 * When DB has no Enrollment / SubjectEnrollment / StudentClassAssignment:
 * create them for Kirtan so we have students to generate attendance for.
 */
async function seedKirtanEnrollmentsAndAssignments(
  prisma: PrismaClient,
  termId: number,
  subjectId: number,
  termSubjectLevelId: number,
  sectionId: number
) {
  const kirtanTermSubject = await prisma.termSubject.findFirst({
    where: { termId, subjectId },
  });
  if (!kirtanTermSubject) {
    console.log('Kirtan TermSubject not found. Skipping enrollment seed.');
    return;
  }

  let studentsInTerm = await prisma.student.findMany({
    where: {
      role: 'STUDENT',
      isActive: true,
      studentTermFee: { some: { termId } },
    },
    select: { id: true },
    take: 20,
  });

  if (studentsInTerm.length === 0) {
    const activeStudents = await prisma.student.findMany({
      where: { role: 'STUDENT', isActive: true },
      select: { id: true },
      take: 20,
    });
    if (activeStudents.length === 0) {
      console.log('No active students found. Skipping enrollment seed.');
      return;
    }
    console.log(`No students had term fee. Creating StudentTermFee for ${activeStudents.length} students...`);
    const termSubjectGroupId = kirtanTermSubject.termSubjectGroupId;
    for (const s of activeStudents) {
      await prisma.studentTermFee.upsert({
        where: {
          studentId_termSubjectGroupId_termId: {
            studentId: s.id,
            termSubjectGroupId,
            termId,
          },
        },
        create: {
          studentId: s.id,
          termSubjectGroupId,
          termId,
        },
        update: {},
      });
    }
    studentsInTerm = activeStudents;
  }

  console.log(`Seeding Kirtan enrollment + class assignment for ${studentsInTerm.length} students...`);
  const termSubjectGroupId = kirtanTermSubject.termSubjectGroupId;

  for (const student of studentsInTerm) {
    let enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: student.id,
        termSubjectGroupId,
        subjectEnrollment: {
          termSubjectId: kirtanTermSubject.id,
        },
      },
      include: { subjectEnrollment: true },
    });

    if (!enrollment) {
      const newEnrollment = await prisma.enrollment.create({
        data: {
          studentId: student.id,
          termSubjectGroupId,
        },
        select: { id: true },
      });
      const newSubjectEnrollment = await prisma.subjectEnrollment.create({
        data: {
          enrollmentId: newEnrollment.id,
          termSubjectId: kirtanTermSubject.id,
        },
      });
      await prisma.enrollment.update({
        where: { id: newEnrollment.id },
        data: { subjectEnrollmentId: newSubjectEnrollment.id },
      });
      const updated = await prisma.enrollment.findUnique({
        where: { id: newEnrollment.id },
        include: { subjectEnrollment: true },
      });
      if (!updated) continue;
      enrollment = updated;
    }

    if (!enrollment) continue;

    const existingAssignment = await prisma.studentClassAssignment.findFirst({
      where: {
        enrollmentId: enrollment.id,
        termSubjectLevelId,
        sectionId,
        isCurrentlyAssigned: true,
      },
    });
    if (!existingAssignment) {
      await prisma.studentClassAssignment.create({
        data: {
          enrollmentId: enrollment.id,
          studentId: student.id,
          termSubjectLevelId,
          sectionId,
          isCurrentlyAssigned: true,
        },
      });
    }
  }
  console.log('Kirtan enrollments and class assignments created.');
}

async function ingestKirtanStats() {
  console.log('Finding current term and Kirtan setup...');

  const currentTerm = await prisma.term.findFirst({
    where: { currentTerm: true },
    select: { id: true, startDate: true, name: true },
  });
  if (!currentTerm) {
    throw new Error('No current term found. Create and set a current term first.');
  }

  const subject = await prisma.subject.findFirst({
    where: { OR: [{ name: 'Kirtan' }, { name: 'kirtan' }] },
  });
  if (!subject) {
    throw new Error('Subject "Kirtan" not found. Run seed-term-subjects or create Kirtan subject first.');
  }

  const level = await prisma.level.findFirst({ where: {} });
  if (!level) {
    throw new Error('No level found. Run seed-term-subjects first.');
  }

  await ensureKirtanTermSubjectAndGroup(prisma, currentTerm, subject.id, level.id);

  let termSubjectLevel = await prisma.termSubjectLevel.findFirst({
    where: {
      termId: currentTerm.id,
      subjectId: subject.id,
    },
    include: { sections: { take: 1 } },
  });

  if (!termSubjectLevel) {
    console.log('Creating Kirtan TermSubjectLevel...');
    termSubjectLevel = await prisma.termSubjectLevel.create({
      data: {
        termId: currentTerm.id,
        subjectId: subject.id,
        levelId: level.id,
      },
      include: { sections: true },
    });
  }

  let section: { id: number; name: string } | null = termSubjectLevel.sections[0] ?? null;
  if (!section) {
    const sectionName = 'Kirtan Section A';
    console.log(`Creating section "${sectionName}" and linking to Kirtan...`);
    await prisma.section.upsert({
      where: { name: sectionName },
      update: {
        termSubjectLevel: { connect: { id: termSubjectLevel.id } },
      },
      create: {
        name: sectionName,
        termSubjectLevel: { connect: { id: termSubjectLevel.id } },
      },
    });
    const created = await prisma.section.findUnique({
      where: { name: sectionName },
      select: { id: true, name: true },
    });
    if (!created) throw new Error('Failed to create section');
    section = created;
  }

  let kirtanAssignments = await prisma.studentClassAssignment.findMany({
    where: {
      termSubjectLevelId: termSubjectLevel.id,
      sectionId: section.id,
      isCurrentlyAssigned: true,
      student: {
        isActive: true,
        role: 'STUDENT',
        studentTermFee: { some: { termId: currentTerm.id } },
      },
    },
    include: { student: { select: { id: true } } },
  });

  if (kirtanAssignments.length === 0) {
    await seedKirtanEnrollmentsAndAssignments(
      prisma,
      currentTerm.id,
      subject.id,
      termSubjectLevel.id,
      section.id
    );
    kirtanAssignments = await prisma.studentClassAssignment.findMany({
      where: {
        termSubjectLevelId: termSubjectLevel.id,
        sectionId: section.id,
        isCurrentlyAssigned: true,
        student: {
          isActive: true,
          role: 'STUDENT',
          studentTermFee: { some: { termId: currentTerm.id } },
        },
      },
      include: { student: { select: { id: true } } },
    });
  }

  const allStudentIds = [...new Set(kirtanAssignments.map((a) => a.studentId))].sort((a, b) => a - b);
  const studentIds = allStudentIds.slice(0, TARGET_EXPECTED);
  if (studentIds.length === 0) {
    console.log('No students in term with fees. Creating school days only (stats will show 0).');
  } else {
    console.log(
      `Using ${studentIds.length} students in Kirtan for sample stats: Day1 50% (5/10), Day2 70% (7/10), etc.`
    );
  }

  const dates = getPastWeekdays(NUM_DAYS);
  const termStart = new Date(currentTerm.startDate);
  termStart.setHours(0, 0, 0, 0);

  for (let dayIndex = 0; dayIndex < dates.length; dayIndex++) {
    const d = dates[dayIndex];
    if (d < termStart) continue;
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const targetPresent = PRESENT_PER_DAY[dayIndex] ?? Math.floor(TARGET_EXPECTED * 0.5);
    const presentCountForDay = Math.min(
      studentIds.length < TARGET_EXPECTED
        ? Math.round((targetPresent / TARGET_EXPECTED) * studentIds.length)
        : targetPresent,
      studentIds.length
    );

    let schoolDay = await prisma.schoolDay.findFirst({
      where: { schoolOperatedDate: dayStart },
    });
    if (!schoolDay) {
      schoolDay = await prisma.schoolDay.create({
        data: {
          schoolOperatedDate: dayStart,
          isOnWeekday: true,
          isOnSunday: false,
        },
      });
    }

    for (let studentIndex = 0; studentIndex < studentIds.length; studentIndex++) {
      const studentId = studentIds[studentIndex];
      const existing = await prisma.schoolCheckInAttendance.findFirst({
        where: {
          studentId,
          date: { gte: dayStart, lte: new Date(dayStart.getTime() + 86400000 - 1) },
        },
      });
      if (existing) continue;

      const checkedIn = studentIndex < presentCountForDay;
      const attendanceRecord = await prisma.schoolCheckInAttendance.create({
        data: {
          studentId,
          date: dayStart,
          schoolDayId: schoolDay.id,
          attendanceValue: checkedIn ? 1 : 0,
          isOnLeave: false,
          checkedIn,
          isMarked: true,
        },
      });

      const assignmentsForStudent = kirtanAssignments.filter((a) => a.studentId === studentId);
      for (const assignment of assignmentsForStudent) {
        await prisma.classAttendance.upsert({
          where: {
            studentClassAssignmentId_date: {
              studentClassAssignmentId: assignment.id,
              date: dayStart,
            },
          },
          create: {
            studentClassAssignmentId: assignment.id,
            date: dayStart,
            schoolCheckInAttendanceId: attendanceRecord.id,
            attendanceStatus: checkedIn ? 'PRESENT' : 'ABSENT',
            schoolDayId: schoolDay.id,
            remarks: 'NA',
          },
          update: {},
        });
      }
    }
    console.log(
      `  ${dayStart.toISOString().slice(0, 10)}: expected ${studentIds.length}, present ${presentCountForDay}, absent ${studentIds.length - presentCountForDay}`
    );
  }

  await verifyKirtanStats(currentTerm.startDate);
  console.log('Done. Kirtan Stats dashboard should now show data for the last 5 weekdays.');
}

/** Same query as the dashboard API – use this to verify stats without opening the UI. */
async function verifyKirtanStats(termStartDate: Date) {
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const termStart = new Date(termStartDate);
  termStart.setHours(0, 0, 0, 0);

  const lastFive = await prisma.schoolDay.findMany({
    where: {
      schoolOperatedDate: { lte: startDate, gte: termStart },
    },
    include: {
      schoolAttendances: {
        where: {
          classAttendance: {
            some: {
              studentClassAssignment: {
                termSubjectLevel: {
                  subject: { name: 'Kirtan' },
                },
              },
            },
          },
        },
      },
    },
    take: 5,
    orderBy: { schoolOperatedDate: 'desc' },
  });

  console.log('\n--- Kirtan stats verification (same logic as dashboard) ---');
  if (lastFive.length === 0) {
    console.log('No school days in range. Create school days and run ingest again.');
    return;
  }
  for (const day of lastFive) {
    const expected = day.schoolAttendances.length;
    const present = day.schoolAttendances.filter((a) => a.checkedIn).length;
    const absent = expected - present;
    const pct = expected === 0 ? '0.00' : ((present / expected) * 100).toFixed(2);
    const dateStr = new Date(day.schoolOperatedDate).toISOString().slice(0, 10);
    console.log(`  ${dateStr}  Expected: ${expected}  Present: ${present}  Absent: ${absent}  Attendance: ${pct}%`);
  }
  console.log('--- Compare these numbers with the Kirtan Stats page in the app ---\n');
}

ingestKirtanStats()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
