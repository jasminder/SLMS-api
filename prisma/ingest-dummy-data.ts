/**
 * Dummy Data Ingestion Script for SLMS
 *
 * Populates the system with realistic test data: students, invoices (fee payments),
 * payments (installments), attendance, timetable, leaves, events, and related records.
 * Maintains proper relationships (students ↔ enrollments ↔ invoices ↔ payments).
 *
 * Scenarios: Paid, Pending, and Overdue invoices with corresponding payment installments.
 *
 * Usage:
 *   npx ts-node prisma/ingest-dummy-data.ts              # Ingest only (skip if dummy data exists)
 *   npx ts-node prisma/ingest-dummy-data.ts --reset      # Delete all dummy data only
 *   npx ts-node prisma/ingest-dummy-data.ts --full       # Reset then ingest (full re-generate)
 *
 * Env:
 *   RESET_DUMMY_DATA=1  same as --reset
 *   FULL_RESET=1        same as --full
 *
 * Dummy data is tagged with:
 *   - Student emails: *@slms-dummy.test
 *   - FeeTemplate notes: "Dummy ingest"
 *   - Event/Notice titles: "Dummy ..." or "Test ..."
 */

import { PrismaClient, PaymentType, PaymentStatus, PaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();

const DUMMY_EMAIL_DOMAIN = '@slms-dummy.test';
const DUMMY_TAG = 'Dummy ingest';
const NUM_STUDENTS = 12;
/** Active students with no enrollment for current term – show under "Students Without Subjects" tab. */
const NUM_STUDENTS_WITHOUT_SUBJECTS = 3;
const TOTAL_DUMMY_STUDENTS = NUM_STUDENTS + NUM_STUDENTS_WITHOUT_SUBJECTS;
const TERM_FEE_AMOUNT = 350;
const MONTHLY_FEE_AMOUNT = 120;
const NUM_MONTHLY_INVOICES = 4;
const PRESENT_PER_DAY = [6, 8, 7, 9, 5];

const FIRST_NAMES = ['Arjun', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Sneha', 'Aditya', 'Kavya', 'Rahul', 'Isha', 'Neel', 'Diya', 'Ravi', 'Sana', 'Arnav'];
const LAST_NAMES = ['Sharma', 'Patel', 'Singh', 'Kaur', 'Kumar', 'Reddy', 'Nair', 'Mehta', 'Gupta', 'Joshi', 'Iyer', 'Pillai', 'Verma', 'Shah', 'Desai'];
const SUBURBS = ['Melbourne', 'Richmond', 'Footscray', 'Dandenong', 'Springvale', 'Clayton', 'Glen Waverley', 'Box Hill'];

function parseArgs(): { reset: boolean; full: boolean } {
  const args = process.argv.slice(2);
  const envReset = process.env.RESET_DUMMY_DATA === '1' || process.env.RESET_DUMMY_DATA === 'true';
  const envFull = process.env.FULL_RESET === '1' || process.env.FULL_RESET === 'true';
  return {
    reset: envReset || args.includes('--reset'),
    full: envFull || args.includes('--full'),
  };
}

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

async function getDummyStudentIds(): Promise<number[]> {
  const students = await prisma.student.findMany({
    where: { personalDetails: { email: { endsWith: DUMMY_EMAIL_DOMAIN } } },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  return students.map((s) => s.id);
}

async function resetDummyData() {
  console.log('Resetting dummy data...\n');
  const dummyIds = await getDummyStudentIds();
  if (dummyIds.length === 0) {
    console.log('No dummy students found. Nothing to reset.');
    return;
  }

  const studentTermFeeIds = (await prisma.studentTermFee.findMany({
    where: { studentId: { in: dummyIds } },
    select: { id: true },
  })).map((s) => s.id);

  const feePayments = await prisma.feePayment.findMany({
    where: { studentTermFeeId: { in: studentTermFeeIds } },
    select: { id: true },
  });
  const feePaymentIds = feePayments.map((p) => p.id);

  await prisma.paymentInstallment.deleteMany({ where: { feePaymentId: { in: feePaymentIds } } });
  await prisma.feePayment.deleteMany({ where: { id: { in: feePaymentIds } } });

  const dummyTemplates = await prisma.feeTemplate.findMany({
    where: { notes: { contains: DUMMY_TAG } },
    select: { id: true },
  });
  await prisma.feePayment.deleteMany({ where: { feeTemplateId: { in: dummyTemplates.map((t) => t.id) } } });
  await prisma.feeTemplate.deleteMany({ where: { id: { in: dummyTemplates.map((t) => t.id) } } });

  const assignments = await prisma.studentClassAssignment.findMany({
    where: { studentId: { in: dummyIds } },
    select: { id: true },
  });
  const assignmentIds = assignments.map((a) => a.id);
  await prisma.classAttendance.deleteMany({ where: { studentClassAssignmentId: { in: assignmentIds } } });

  await prisma.schoolCheckInAttendance.deleteMany({ where: { studentId: { in: dummyIds } } });
  await prisma.leave.deleteMany({ where: { studentId: { in: dummyIds } } });

  const dummyNotices = await prisma.studentNotice.findMany({
    where: { title: { startsWith: 'Dummy ' } },
    select: { id: true },
  });
  const noticeIds = dummyNotices.map((n) => n.id);
  if (noticeIds.length) {
    await prisma.studentNoticeAcknowledgement.deleteMany({ where: { studentNoticeId: { in: noticeIds } } });
    await prisma.studentNotice.deleteMany({ where: { id: { in: noticeIds } } });
  }

  const eventsWithDummy = await prisma.event.findMany({
    where: { data: { title: { startsWith: 'Dummy ' } } },
    include: { data: true },
  });
  for (const e of eventsWithDummy) {
    if (e.data) await prisma.appointment.deleteMany({ where: { eventId: e.id } });
    await prisma.event.deleteMany({ where: { id: e.id } });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: { in: dummyIds } },
    select: { id: true },
  });
  const enrollmentIds = enrollments.map((e) => e.id);
  await prisma.studentClassAssignment.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } });
  await prisma.subjectEnrollment.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } });
  await prisma.enrollment.deleteMany({ where: { id: { in: enrollmentIds } } });
  await prisma.studentTermFee.deleteMany({ where: { studentId: { in: dummyIds } } });
  await prisma.student.deleteMany({ where: { id: { in: dummyIds } } });

  console.log(`Reset complete. Removed ${dummyIds.length} dummy students and all related records.\n`);
}

async function ensureTermAndStructure() {
  console.log('1. Ensuring term, subjects, levels, sections...');
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
  if (!term.currentTerm || !term.isPublish) {
    await prisma.term.updateMany({ data: { currentTerm: false } });
    await prisma.term.update({
      where: { id: term.id },
      data: { currentTerm: true, isPublish: true },
    });
    term = (await prisma.term.findFirst({ where: { currentTerm: true } }))!;
  }

  const levelName = 'beginner';
  const sectionName = 'Section A';
  const group = await prisma.subjectGroup.findFirst({ where: { groupName: 'main' } }) ?? await prisma.subjectGroup.create({ data: { groupName: 'main' } });
  const fee = await prisma.fee.findFirst({ where: { amount: TERM_FEE_AMOUNT, paymentType: 'TERM' } })
    ?? await prisma.fee.create({ data: { amount: TERM_FEE_AMOUNT, paymentType: 'TERM' } });
  const level = await prisma.level.findFirst({ where: { name: levelName } }) ?? await prisma.level.create({ data: { name: levelName } });

  const subjectNames = ['kirtan', 'punjabi', 'gurmatti', 'gatka', 'gurbaani santhiya'];
  let tsg = await prisma.termSubjectGroup.findUnique({
    where: { termId_subjectGroupId: { termId: term.id, subjectGroupId: group.id } },
  });
  if (!tsg) {
    tsg = await prisma.termSubjectGroup.create({
      data: { termId: term.id, subjectGroupId: group.id, feeId: fee.id },
    });
  }

  for (const name of subjectNames) {
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

  const kirtanSubject = await prisma.subject.findFirst({ where: { name: 'kirtan' } });
  if (!kirtanSubject) throw new Error('Kirtan subject not found. Ensure subjects are created.');
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
      where: { name: sectionName },
      update: { termSubjectLevel: { connect: { id: tsl.id } } },
      create: { name: sectionName, termSubjectLevel: { connect: { id: tsl.id } } },
    });
    section = (await prisma.section.findUnique({ where: { name: sectionName } }))!;
  }

  const kirtanTermSubject = await prisma.termSubject.findFirst({ where: { termId: term.id, subjectId: kirtanSubject.id } });
  if (!kirtanTermSubject) throw new Error('Kirtan term subject not found.');
  return { term, level, tsg, tsl, section, kirtanTermSubject };
}

async function createDummyStudents(): Promise<number[]> {
  console.log('2. Creating dummy students...');
  const dob = new Date('2012-06-15');
  const students: number[] = [];
  for (let i = 0; i < TOTAL_DUMMY_STUDENTS; i++) {
    const email = `test.${FIRST_NAMES[i].toLowerCase()}.${i + 1}${DUMMY_EMAIL_DOMAIN}`;
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
            firstName: FIRST_NAMES[i],
            lastName: LAST_NAMES[i],
            DOB: dob,
            gender: i % 2 === 0 ? 'Female' : 'Male',
            email,
            contact: `04${String(i + 1).padStart(8, '0')}`,
            address: `${(i % 20) + 1} ${SUBURBS[i % SUBURBS.length]} Rd`,
            suburb: SUBURBS[i % SUBURBS.length],
            state: 'VIC',
            country: 'Australia',
            postcode: '3000',
          },
        },
        parentsDetails: {
          create: {
            fatherName: `Parent ${LAST_NAMES[i]}`,
            motherName: `Parent ${FIRST_NAMES[i]}`,
            parentEmail: `parent.${i + 1}${DUMMY_EMAIL_DOMAIN}`,
            parentContact: '0400000000',
          },
        },
        emergencyContact: {
          create: {
            contactPerson: `Emergency ${FIRST_NAMES[i]}`,
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
          create: { otherInfo: 'Test student', declaration: ['Agreed'] },
        },
      },
    });
    students.push(s.id);
  }
  console.log(`   ${students.length} students ready (${NUM_STUDENTS} with subjects, ${NUM_STUDENTS_WITHOUT_SUBJECTS} without subjects for current term).`);
  return students;
}

async function enrollAndAssign(
  studentIds: number[],
  termId: number,
  termSubjectGroupId: number,
  kirtanTermSubjectId: number,
  termSubjectLevelId: number,
  sectionId: number
) {
  console.log('3. Enrolling students and assigning to class...');
  for (const studentId of studentIds) {
    await prisma.studentTermFee.upsert({
      where: { studentId_termSubjectGroupId_termId: { studentId, termSubjectGroupId, termId } },
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
      enrollment = await prisma.enrollment.findUnique({ where: { id: newEnroll.id } });
    }
    if (!enrollment) throw new Error('Enrollment not found for student ' + studentId);
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

async function createInvoicesAndPayments(
  term: { id: number; name: string; startDate: Date },
  tsg: { id: number },
  studentIds: number[]
) {
  console.log('4. Creating fee templates and invoices (Paid / Pending / Overdue)...');
  const now = new Date();
  const dueDateTerm = new Date(term.startDate);
  dueDateTerm.setDate(dueDateTerm.getDate() + 14);
  const month = dueDateTerm.toLocaleString('default', { month: 'long' });
  const year = dueDateTerm.getFullYear().toString();
  const groupName = 'main';

  const termTemplate = await prisma.feeTemplate.upsert({
    where: {
      invoiceName_dueDate_groupName_interval: {
        invoiceName: `Dummy Term Fee ${term.name}`,
        dueDate: dueDateTerm,
        groupName,
        interval: PaymentType.TERM,
      },
    },
    create: {
      groupName,
      month,
      year,
      termName: term.name,
      termId: term.id,
      termSubjectGroupId: tsg.id,
      amount: TERM_FEE_AMOUNT,
      dueDate: dueDateTerm,
      interval: PaymentType.TERM,
      invoiceName: `Dummy Term Fee ${term.name}`,
      notes: DUMMY_TAG,
    },
    update: {},
  });

  const studentTermFees = await prisma.studentTermFee.findMany({
    where: { studentId: { in: studentIds }, termId: term.id, termSubjectGroupId: tsg.id },
    include: { student: { select: { id: true, akaalId: true } } },
  });

  const termMonthNum = (dueDateTerm.getMonth() + 1).toString().padStart(2, '0');
  const termPayments: { id: number; studentId: number }[] = [];
  for (let i = 0; i < studentTermFees.length; i++) {
    const stf = studentTermFees[i];
    const student = stf.student;
    const invoiceId = `D${student.akaalId ?? student.id}_${tsg.id}_${termMonthNum}T`;
    const existing = await prisma.feePayment.findFirst({
      where: { studentTermFeeId: stf.id, feeTemplateId: termTemplate.id },
    });
    if (existing) {
      termPayments.push({ id: existing.id, studentId: stf.studentId });
      continue;
    }
    const fp = await prisma.feePayment.create({
      data: {
        invoiceId,
        studentTermFeeId: stf.id,
        feeTemplateId: termTemplate.id,
        dueDate: dueDateTerm,
        dueAmount: TERM_FEE_AMOUNT,
        status: PaymentStatus.PENDING,
        feeAmount: TERM_FEE_AMOUNT,
        adjustedFeeAmount: TERM_FEE_AMOUNT,
        hasDue: true,
        hasOverDue: false,
      },
    });
    termPayments.push({ id: fp.id, studentId: stf.studentId });
  }

  const monthlyTemplates: { id: number; dueDate: Date }[] = [];
  for (let m = 0; m < NUM_MONTHLY_INVOICES; m++) {
    const dueDateM = new Date(term.startDate);
    dueDateM.setMonth(dueDateM.getMonth() + m);
    dueDateM.setDate(15);
    const monthLabel = dueDateM.toLocaleString('default', { month: 'long' });
    const yearM = dueDateM.getFullYear().toString();
    const invoiceName = `Dummy Monthly ${monthLabel} ${yearM}`;
    const template = await prisma.feeTemplate.upsert({
      where: {
        invoiceName_dueDate_groupName_interval: {
          invoiceName,
          dueDate: dueDateM,
          groupName,
          interval: PaymentType.MONTHLY,
        },
      },
      create: {
        groupName,
        month: monthLabel,
        year: yearM,
        termName: term.name,
        termId: term.id,
        termSubjectGroupId: tsg.id,
        amount: MONTHLY_FEE_AMOUNT,
        dueDate: dueDateM,
        interval: PaymentType.MONTHLY,
        invoiceName,
        notes: DUMMY_TAG,
      },
      update: {},
    });
    monthlyTemplates.push({ id: template.id, dueDate: dueDateM });
  }

  const allMonthlyPayments: { id: number; feeTemplateId: number; dueDate: Date; studentId: number }[] = [];
  for (const t of monthlyTemplates) {
    for (const stf of studentTermFees) {
      const student = stf.student;
      const monthNum = (t.dueDate.getMonth() + 1).toString().padStart(2, '0');
      const invoiceId = `D${student.akaalId ?? student.id}_${tsg.id}_${monthNum}M`;
      const existing = await prisma.feePayment.findFirst({
        where: { studentTermFeeId: stf.id, feeTemplateId: t.id },
      });
      if (existing) {
        allMonthlyPayments.push({
          id: existing.id,
          feeTemplateId: t.id,
          dueDate: t.dueDate,
          studentId: stf.studentId,
        });
        continue;
      }
      const fp = await prisma.feePayment.create({
        data: {
          invoiceId,
          studentTermFeeId: stf.id,
          feeTemplateId: t.id,
          dueDate: t.dueDate,
          dueAmount: MONTHLY_FEE_AMOUNT,
          status: PaymentStatus.PENDING,
          feeAmount: MONTHLY_FEE_AMOUNT,
          adjustedFeeAmount: MONTHLY_FEE_AMOUNT,
          hasDue: true,
          hasOverDue: false,
        },
      });
      allMonthlyPayments.push({ id: fp.id, feeTemplateId: t.id, dueDate: t.dueDate, studentId: stf.studentId });
    }
  }

  const pastDue = new Date(now);
  pastDue.setDate(pastDue.getDate() - 15);

  const numPaidTerm = Math.min(4, termPayments.length);
  for (let i = 0; i < numPaidTerm; i++) {
    const fp = termPayments[i];
    await prisma.paymentInstallment.create({
      data: {
        feePaymentId: fp.id,
        paidAmount: TERM_FEE_AMOUNT,
        paidDate: new Date(now),
        paymentMethod: PaymentMethod.CASH,
        paymentStatus: PaymentStatus.PAID,
        remarks: 'Dummy full payment',
        receivedBy: 'Admin',
      },
    });
    await prisma.feePayment.update({
      where: { id: fp.id },
      data: { dueAmount: 0, status: PaymentStatus.PAID, hasDue: false, hasOverDue: false, paidDate: now, amountPaid: TERM_FEE_AMOUNT },
    });
  }

  const firstMonthTemplateId = monthlyTemplates[0].id;
  const firstMonthPayments = allMonthlyPayments.filter((p) => p.feeTemplateId === firstMonthTemplateId);
  const numOverdue = Math.min(3, firstMonthPayments.length);
  for (let i = 0; i < numOverdue; i++) {
    const fp = firstMonthPayments[i];
    await prisma.feePayment.update({
      where: { id: fp.id },
      data: { dueDate: pastDue, status: PaymentStatus.OVERDUE, hasOverDue: true },
    });
  }

  const numPartial = 1;
  if (firstMonthPayments.length > numOverdue) {
    const fp = firstMonthPayments[numOverdue];
    const partial = Math.floor(MONTHLY_FEE_AMOUNT / 2);
    const remaining = MONTHLY_FEE_AMOUNT - partial;
    await prisma.paymentInstallment.create({
      data: {
        feePaymentId: fp.id,
        paidAmount: partial,
        paidDate: new Date(now),
        paymentMethod: PaymentMethod.CASH,
        paymentStatus: PaymentStatus.PAID,
        remarks: 'Dummy partial payment',
        receivedBy: 'Admin',
      },
    });
    await prisma.feePayment.update({
      where: { id: fp.id },
      data: { dueAmount: remaining, amountPaid: partial },
    });
  }

  const numPaidMonthly = Math.min(5, firstMonthPayments.length);
  for (let i = numOverdue + numPartial + 1; i < numPaidMonthly && i < firstMonthPayments.length; i++) {
    const fp = firstMonthPayments[i];
    await prisma.paymentInstallment.create({
      data: {
        feePaymentId: fp.id,
        paidAmount: MONTHLY_FEE_AMOUNT,
        paidDate: new Date(now),
        paymentMethod: PaymentMethod.CREDIT_CARD,
        paymentStatus: PaymentStatus.PAID,
        remarks: 'Dummy monthly paid',
        receivedBy: 'Admin',
      },
    });
    await prisma.feePayment.update({
      where: { id: fp.id },
      data: { dueAmount: 0, status: PaymentStatus.PAID, hasDue: false, hasOverDue: false, paidDate: now, amountPaid: MONTHLY_FEE_AMOUNT },
    });
  }

  console.log(`   Term invoices: ${termPayments.length} (${numPaidTerm} Paid, rest Pending).`);
  console.log(`   Monthly invoices: ${allMonthlyPayments.length} (${numOverdue} Overdue, 1 Partial, ${numPaidMonthly - numOverdue - numPartial} Paid, rest Pending).`);
}

async function createAttendance(
  studentIds: number[],
  termStart: Date,
  termSubjectLevelId: number,
  sectionId: number
) {
  console.log('5. Creating school days and attendance...');
  const assignments = await prisma.studentClassAssignment.findMany({
    where: {
      termSubjectLevelId,
      sectionId,
      isCurrentlyAssigned: true,
      studentId: { in: studentIds },
    },
  });
  const ids = [...new Set(assignments.map((a) => a.studentId))].sort((a, b) => a - b).slice(0, NUM_STUDENTS);
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
      for (const a of assignments.filter((a) => a.studentId === studentId)) {
        await prisma.classAttendance.upsert({
          where: { studentClassAssignmentId_date: { studentClassAssignmentId: a.id, date: dayStart } },
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
  console.log(`   ${dates.length} school days with check-in and class attendance.`);
}

async function createLeaves(studentIds: number[], adminId: number | null) {
  console.log('6. Creating leave applications...');
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

  const existing1 = await prisma.leave.findFirst({ where: { studentId: studentIds[0], startDate: start1 } });
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
  const existing2 = await prisma.leave.findFirst({ where: { studentId: studentIds[1], startDate: start2 } });
  if (!existing2) {
    await prisma.leave.create({
      data: {
        studentId: studentIds[1],
        appliedById: appliedBy,
        appliedByRole: role,
        startDate: start2,
        endDate: end2,
        reason: 'Medical appointment',
        status: 'APPROVED',
        comments: 'Dummy approved leave',
      },
    });
  }
  console.log('   2 leaves (1 PENDING, 1 APPROVED).');
}

async function createNotices(studentIds: number[]) {
  console.log('7. Creating student notices...');
  const admin = await prisma.admin.findFirst({ select: { id: true } });
  if (!admin) {
    console.log('   No admin – skipping notices.');
    return;
  }
  const notice1 = await prisma.studentNotice.findFirst({ where: { title: 'Dummy Welcome Notice' } });
  if (!notice1) {
    const n = await prisma.studentNotice.create({
      data: { adminId: admin.id, title: 'Dummy Welcome Notice', content: 'Welcome to the school. This is test notice content.' },
    });
    for (const sid of studentIds.slice(0, 5)) {
      await prisma.studentNoticeAcknowledgement.upsert({
        where: { studentNoticeId_studentId: { studentNoticeId: n.id, studentId: sid } },
        create: { studentNoticeId: n.id, studentId: sid, isSeen: false },
        update: {},
      });
    }
  }
  const notice2 = await prisma.studentNotice.findFirst({ where: { title: 'Dummy Holiday Reminder' } });
  if (!notice2) {
    const n = await prisma.studentNotice.create({
      data: { adminId: admin.id, title: 'Dummy Holiday Reminder', content: 'School closed next Monday for testing.' },
    });
    for (const sid of studentIds.slice(0, 3)) {
      await prisma.studentNoticeAcknowledgement.upsert({
        where: { studentNoticeId_studentId: { studentNoticeId: n.id, studentId: sid } },
        create: { studentNoticeId: n.id, studentId: sid, isSeen: true },
        update: {},
      });
    }
  }
  console.log('   2 student notices created.');
}

async function createEvents() {
  console.log('8. Creating events...');
  const events = await prisma.event.findMany({ include: { data: true } });
  const titles = new Set(events.map((e) => e.data?.title).filter(Boolean));

  if (!titles.has('Dummy School Assembly')) {
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
            title: 'Dummy School Assembly',
            location: 'Main Hall',
            type: 'Event',
          },
        },
      },
    });
  }
  if (!titles.has('Dummy Parent Evening')) {
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
            title: 'Dummy Parent Evening',
            location: 'Room 1',
            type: 'Event',
          },
        },
      },
    });
  }
  console.log('   2 events created.');
}

async function ingest() {
  console.log('Ingesting dummy data...\n');
  const { term, tsg, tsl, section, kirtanTermSubject } = await ensureTermAndStructure();
  const studentIds = await createDummyStudents();
  const enrolledStudentIds = studentIds.slice(0, NUM_STUDENTS);
  await enrollAndAssign(
    enrolledStudentIds,
    term.id,
    tsg.id,
    kirtanTermSubject.id,
    tsl.id,
    section.id
  );
  await createInvoicesAndPayments(term, tsg, enrolledStudentIds);
  await createAttendance(enrolledStudentIds, term.startDate, tsl.id, section.id);
  const admin = await prisma.admin.findFirst({ select: { id: true } });
  await createLeaves(enrolledStudentIds, admin?.id ?? null);
  await createNotices(studentIds);
  await createEvents();
  console.log('\nDummy data ingestion complete.');
  console.log('You can test: Students With Subjects, Students Without Subjects, Invoices, Payments, Attendance, Leaves, Notices, Events.');
  console.log('To reset: npx ts-node prisma/ingest-dummy-data.ts --reset');
  console.log('To re-generate: npx ts-node prisma/ingest-dummy-data.ts --full');
}

/** Ensure given dummy students (or all if not specified) have StudentTermFee for current term so they show under "Students With Subjects". */
async function ensureDummyStudentsHaveCurrentTermFee(onlyTheseIds?: number[]) {
  const term = await prisma.term.findFirst({ where: { currentTerm: true } });
  if (!term) {
    console.warn('No current term. Active Students list requires termId – set a current term first.');
    return;
  }
  const group = await prisma.subjectGroup.findFirst({ where: { groupName: 'main' } });
  if (!group) {
    console.warn('No subject group "main". Run full ingest first.');
    return;
  }
  const tsg = await prisma.termSubjectGroup.findUnique({
    where: { termId_subjectGroupId: { termId: term.id, subjectGroupId: group.id } },
  });
  if (!tsg) {
    console.warn('No TermSubjectGroup for current term. Run full ingest so term structure exists.');
    return;
  }
  const dummyIds = onlyTheseIds ?? (await getDummyStudentIds());
  if (dummyIds.length === 0) return;
  for (const studentId of dummyIds) {
    await prisma.studentTermFee.upsert({
      where: { studentId_termSubjectGroupId_termId: { studentId, termSubjectGroupId: tsg.id, termId: term.id } },
      create: { studentId, termSubjectGroupId: tsg.id, termId: term.id },
      update: {},
    });
  }
  console.log(`Ensured ${dummyIds.length} dummy students have StudentTermFee for current term (id=${term.id}). They should now appear in Active Students → Students With Subjects when termId=${term.id} is selected.`);
}

/** Verify active students count for current term (same filter as API). */
async function verifyActiveStudentsForCurrentTerm(): Promise<{ termId: number; termName: string; count: number } | null> {
  const term = await prisma.term.findFirst({
    where: { currentTerm: true },
    select: { id: true, name: true },
  });
  if (!term) return null;
  const count = await prisma.student.count({
    where: {
      role: 'STUDENT',
      isActive: true,
      studentTermFee: { some: { termId: term.id } },
    },
  });
  return { termId: term.id, termName: term.name, count };
}

async function main() {
  const { reset, full } = parseArgs();
  if (reset || full) {
    await resetDummyData();
    if (!full) return;
  }
  const existing = await getDummyStudentIds();
  if (existing.length > 0 && !full) {
    console.log(`${existing.length} dummy students already exist. Use --full to reset and re-ingest.`);
    await ensureDummyStudentsHaveCurrentTermFee();
    const verified = await verifyActiveStudentsForCurrentTerm();
    if (verified) {
      console.log(`\n--- Verification ---`);
      console.log(`Current term: id=${verified.termId}, name="${verified.termName}". Active students for this term: ${verified.count}.`);
      if (verified.count === 0) {
        console.warn(`\n⚠ No active students for current term. Set a current term in Administration, or run with --full to re-ingest.`);
      }
    }
    return;
  }
  await ingest();
  const studentIds = await getDummyStudentIds();
  const enrolledIds = studentIds.slice(0, NUM_STUDENTS);
  await ensureDummyStudentsHaveCurrentTermFee(enrolledIds);

  const verified = await verifyActiveStudentsForCurrentTerm();
  if (verified) {
    console.log(`\n--- Verification ---`);
    console.log(`Current term: id=${verified.termId}, name="${verified.termName}".`);
    console.log(`Active students (With Subjects) for this term: ${verified.count} (expected ${NUM_STUDENTS}).`);
    console.log(`Active students (Without Subjects): ${NUM_STUDENTS_WITHOUT_SUBJECTS}.`);
    if (verified.count === 0) {
      console.warn(`\n⚠ No active students found for current term. The app uses termId=${verified.termId}.`);
      console.warn(`  - Ensure the Admin Students page uses this term (refresh or re-select term).`);
      console.warn(`  - If you have multiple terms, set this term as "Current term" in Administration.`);
    } else {
      console.log(`\nIn the app: Admin → Students → ensure term "${verified.termName}" (id ${verified.termId}) is selected.`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
