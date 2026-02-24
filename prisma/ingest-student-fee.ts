/**
 * Ingest Student Fee data to verify the fee management feature.
 * By default performs a clean reset: deletes all fee payment records (PaymentInstallment,
 * FeePayment), then creates fresh PENDING fee payment entries only.
 *
 * Creates FeeTemplates (TERM + MONTHLY), FeePayments per student. When CLEAN_RESET_PENDING_ONLY
 * is true (default), no PaymentInstallments or status changes are applied so all entries stay PENDING.
 *
 * Usage:
 *   npx ts-node prisma/ingest-student-fee.ts
 *   npm run ingest-student-fee
 *
 * Prerequisites:
 *   - Current term exists
 *   - At least one TermSubjectGroup for the current term
 *   - Active students with StudentTermFee for that term + group (run seed-dummy-data or ingest-kirtan-stats first if needed)
 */

import { PrismaClient, PaymentType, PaymentStatus, PaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();

const TERM_FEE_AMOUNT = 300;
const MONTHLY_FEE_AMOUNT = 100;
/** Invoice names; must be unique. */
const TERM_INVOICE_NAME = 'SLMS Ingest Term Fee';
const MONTHLY_INVOICE_PREFIX = 'SLMS Ingest Monthly';
/** Number of monthly fee entries to create per student (e.g. 5 = 5 months; 2 extra PENDING entries when run with 2 students). */
const NUM_MONTHLY_ENTRIES = 5;
/** When true, delete all fee payment records first and create only PENDING entries (no PAID/OVERDUE/partial). */
const CLEAN_RESET_PENDING_ONLY = true;

async function main() {
  console.log('Ingesting Student Fee data for fee management verification...\n');

  // --- 0. Clean reset: delete all fee payment records ---
  if (CLEAN_RESET_PENDING_ONLY) {
    const deletedInstallments = await prisma.paymentInstallment.deleteMany({});
    const deletedPayments = await prisma.feePayment.deleteMany({});
    console.log(`Clean reset: deleted ${deletedInstallments.count} PaymentInstallment(s), ${deletedPayments.count} FeePayment(s).\n`);
  }

  const term = await prisma.term.findFirst({ where: { currentTerm: true } });
  if (!term) {
    throw new Error('No current term found. Create or set a current term first.');
  }
  console.log(`Using current term: ${term.name} (id=${term.id})`);

  const tsg = await prisma.termSubjectGroup.findFirst({
    where: { termId: term.id },
    include: { subjectGroup: true },
  });
  if (!tsg) {
    throw new Error('No TermSubjectGroup found for current term. Run seed-term-subjects or seed-dummy-data first.');
  }
  console.log(`Using term subject group id=${tsg.id} (${tsg.subjectGroup?.groupName ?? 'main'})`);

  const studentTermFees = await prisma.studentTermFee.findMany({
    where: { termId: term.id, termSubjectGroupId: tsg.id },
    include: { student: { select: { id: true, akaalId: true } } },
  });
  if (studentTermFees.length === 0) {
    throw new Error(
      'No students with StudentTermFee for this term+group. Run seed-dummy-data or ingest-kirtan-stats first.'
    );
  }
  console.log(`Found ${studentTermFees.length} students with term fee.\n`);

  const now = new Date();
  const dueDateTerm = new Date(term.startDate);
  dueDateTerm.setDate(dueDateTerm.getDate() + 14);
  const month = dueDateTerm.toLocaleString('default', { month: 'long' });
  const year = dueDateTerm.getFullYear().toString();
  const dueDateMonthly = new Date(dueDateTerm);

  // --- 1. TERM fee template + fee payments ---
  let termTemplate = await prisma.feeTemplate.findFirst({
    where: { invoiceName: TERM_INVOICE_NAME },
  });
  if (!termTemplate) {
    termTemplate = await prisma.feeTemplate.create({
      data: {
        groupName: tsg.subjectGroup?.groupName ?? 'main',
        month,
        year,
        termName: term.name,
        termId: term.id,
        termSubjectGroupId: tsg.id,
        amount: TERM_FEE_AMOUNT,
        dueDate: dueDateTerm,
        interval: PaymentType.TERM,
        invoiceName: TERM_INVOICE_NAME,
        notes: 'Ingest script – term fee for testing',
      },
    });
    console.log(`Created FeeTemplate (TERM): ${termTemplate.invoiceName} id=${termTemplate.id}`);
  } else {
    console.log(`FeeTemplate (TERM) already exists: ${termTemplate.invoiceName} id=${termTemplate.id}`);
  }

  const termMonthNum = (dueDateTerm.getMonth() + 1).toString().padStart(2, '0');
  for (const stf of studentTermFees) {
    const student = stf.student;
    const invoiceId = `${student.akaalId ?? student.id}${tsg.id}${termMonthNum}T`;
    const existing = await prisma.feePayment.findFirst({
      where: {
        studentTermFeeId: stf.id,
        feeTemplateId: termTemplate.id,
      },
    });
    if (existing) continue;
    await prisma.feePayment.create({
      data: {
        invoiceId,
        studentTermFeeId: stf.id,
        feeTemplateId: termTemplate.id,
        dueDate: dueDateTerm,
        dueAmount: TERM_FEE_AMOUNT,
        status: 'PENDING',
        feeAmount: TERM_FEE_AMOUNT,
        adjustedFeeAmount: TERM_FEE_AMOUNT,
      },
    });
  }
  const termPayments = await prisma.feePayment.findMany({
    where: { feeTemplateId: termTemplate.id },
    orderBy: { id: 'asc' },
  });
  console.log(`  FeePayments (TERM): ${termPayments.length}`);

  // --- 2. Multiple MONTHLY fee templates + fee payments (more entries per student) ---
  const monthlyTemplates: { id: number; dueDate: Date; monthLabel: string; monthNum: string }[] = [];
  for (let m = 0; m < NUM_MONTHLY_ENTRIES; m++) {
    const dueDateM = new Date(term.startDate);
    dueDateM.setMonth(dueDateM.getMonth() + m);
    dueDateM.setDate(15);
    const monthLabel = dueDateM.toLocaleString('default', { month: 'long' });
    const yearM = dueDateM.getFullYear().toString();
    const monthNum = (dueDateM.getMonth() + 1).toString().padStart(2, '0');
    const invoiceName = `${MONTHLY_INVOICE_PREFIX} ${monthLabel} ${yearM}`;
    let template = await prisma.feeTemplate.findFirst({
      where: { invoiceName },
    });
    if (!template) {
      template = await prisma.feeTemplate.create({
        data: {
          groupName: tsg.subjectGroup?.groupName ?? 'main',
          month: monthLabel,
          year: yearM,
          termName: term.name,
          termId: term.id,
          termSubjectGroupId: tsg.id,
          amount: MONTHLY_FEE_AMOUNT,
          dueDate: dueDateM,
          interval: PaymentType.MONTHLY,
          invoiceName,
          notes: `Ingest script – monthly fee ${monthLabel} ${yearM}`,
        },
      });
      console.log(`Created FeeTemplate (MONTHLY): ${template.invoiceName} id=${template.id}`);
    }
    monthlyTemplates.push({ id: template.id, dueDate: dueDateM, monthLabel, monthNum });
    for (const stf of studentTermFees) {
      const student = stf.student;
      const invoiceId = `${student.akaalId ?? student.id}${tsg.id}${monthNum}${m}`;
      const existing = await prisma.feePayment.findFirst({
        where: {
          studentTermFeeId: stf.id,
          feeTemplateId: template.id,
        },
      });
      if (existing) continue;
      await prisma.feePayment.create({
        data: {
          invoiceId,
          studentTermFeeId: stf.id,
          feeTemplateId: template.id,
          dueDate: dueDateM,
          dueAmount: MONTHLY_FEE_AMOUNT,
          status: 'PENDING',
          feeAmount: MONTHLY_FEE_AMOUNT,
          adjustedFeeAmount: MONTHLY_FEE_AMOUNT,
        },
      });
    }
  }
  const allMonthlyPayments = await prisma.feePayment.findMany({
    where: {
      feeTemplateId: { in: monthlyTemplates.map((t) => t.id) },
    },
    orderBy: [{ feeTemplateId: 'asc' }, { id: 'asc' }],
  });
  console.log(`  FeePayments (MONTHLY): ${allMonthlyPayments.length} total across ${NUM_MONTHLY_ENTRIES} months\n`);

  if (!CLEAN_RESET_PENDING_ONLY) {
    // --- 3. Add variety: some PAID, some OVERDUE, some with installments ---
    const firstMonthlyTemplateId = monthlyTemplates[0].id;
    const monthlyPayments = allMonthlyPayments.filter((p) => p.feeTemplateId === firstMonthlyTemplateId);
    const paidCount = Math.min(2, termPayments.length);
    const overdueCount = Math.min(1, monthlyPayments.length);
    const pastDue = new Date(now);
    pastDue.setDate(pastDue.getDate() - 10);

    for (let i = 0; i < paidCount; i++) {
      const fp = termPayments[i];
      const currentDue = fp.dueAmount ?? TERM_FEE_AMOUNT;
      if (currentDue <= 0) continue;
      await prisma.paymentInstallment.create({
        data: {
          feePaymentId: fp.id,
          paidAmount: currentDue,
          paidDate: new Date(),
          paymentMethod: PaymentMethod.CASH,
          paymentStatus: PaymentStatus.PAID,
          remarks: 'Ingest: full payment for testing',
          receivedBy: 'ADMIN',
        },
      });
      await prisma.feePayment.update({
        where: { id: fp.id },
        data: { dueAmount: 0, status: PaymentStatus.PAID, hasOverDue: false },
      });
    }

    for (let i = 0; i < overdueCount; i++) {
      const fp = monthlyPayments[i];
      await prisma.feePayment.update({
        where: { id: fp.id },
        data: {
          dueDate: pastDue,
          status: PaymentStatus.OVERDUE,
          hasOverDue: true,
        },
      });
    }

    const partialIndex = overdueCount;
    if (monthlyPayments.length > partialIndex) {
      const fp = monthlyPayments[partialIndex];
      const partial = Math.floor(MONTHLY_FEE_AMOUNT / 2);
      const remaining = (fp.dueAmount ?? MONTHLY_FEE_AMOUNT) - partial;
      if (remaining > 0) {
        await prisma.paymentInstallment.create({
          data: {
            feePaymentId: fp.id,
            paidAmount: partial,
            paidDate: new Date(),
            paymentMethod: PaymentMethod.CASH,
            paymentStatus: PaymentStatus.PENDING,
            remarks: 'Ingest: partial payment',
            receivedBy: 'ADMIN',
          },
        });
        await prisma.feePayment.update({
          where: { id: fp.id },
          data: { dueAmount: remaining },
        });
      }
    }

    const paymentsByTemplate = monthlyTemplates.map((t) =>
      allMonthlyPayments.filter((p) => p.feeTemplateId === t.id)
    );
    let monthlyPaidCount = 0;
    for (let t = 1; t < paymentsByTemplate.length && monthlyPaidCount < 3; t++) {
      const list = paymentsByTemplate[t];
      for (let i = 0; i < list.length && monthlyPaidCount < 3; i++) {
        const fp = list[i];
        if ((fp.dueAmount ?? 0) <= 0) continue;
        await prisma.paymentInstallment.create({
          data: {
            feePaymentId: fp.id,
            paidAmount: MONTHLY_FEE_AMOUNT,
            paidDate: new Date(),
            paymentMethod: PaymentMethod.CASH,
            paymentStatus: PaymentStatus.PAID,
            remarks: 'Ingest: monthly paid',
            receivedBy: 'ADMIN',
          },
        });
        await prisma.feePayment.update({
          where: { id: fp.id },
          data: { dueAmount: 0, status: PaymentStatus.PAID, hasOverDue: false },
        });
        monthlyPaidCount++;
      }
    }

    console.log('Sample fee states applied:');
    console.log(`  - ${paidCount} TERM fee(s) marked PAID with installments`);
    console.log(`  - ${overdueCount} MONTHLY fee(s) set OVERDUE (first month)`);
    console.log('  - 1 MONTHLY fee with partial payment (first month)');
    console.log(`  - ${monthlyPaidCount} later-month fee(s) marked PAID\n`);
  } else {
    console.log('All new fee payments created as PENDING (clean reset mode).\n');
  }

  console.log('Ingest complete. You can verify:');
  console.log('  - Admin > Students > Active Student > Fee (Manage Fee, Payment Installments)');
  console.log('  - Finance > Fee Template, Invoice Management');
  console.log('  - Student portal > Fee list & transactions');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
