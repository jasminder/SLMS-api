/**
 * Delete all payment transactions (PaymentInstallments) for a given fee/invoice
 * and reset the fee so it shows only the total amount due (no payments applied).
 *
 * Usage:
 *   npx ts-node prisma/clear-fee-payments-and-show-total-due.ts 21064
 *   npm run clear-fee-payments -- 21064
 *
 * Argument: FeePayment id (e.g. 21064) or invoiceId string to look up.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const raw = process.argv[2];
  if (!raw) {
    console.error('Usage: npx ts-node prisma/clear-fee-payments-and-show-total-due.ts <feePaymentId | invoiceId>');
    process.exit(1);
  }

  const idNum = parseInt(raw, 10);
  const isNumeric = !Number.isNaN(idNum);

  const feePayment = isNumeric
    ? await prisma.feePayment.findUnique({
        where: { id: idNum },
        include: { studentTermFee: { select: { studentId: true } } },
      })
    : await prisma.feePayment.findFirst({
        where: { invoiceId: raw },
        include: { studentTermFee: { select: { studentId: true } } },
      });

  if (!feePayment) {
    console.error(`FeePayment not found for id/invoiceId: ${raw}`);
    process.exit(1);
  }

  const feePaymentId = feePayment.id;
  const totalAmountDue = feePayment.feeAmount ?? feePayment.adjustedFeeAmount ?? 0;

  const deleted = await prisma.paymentInstallment.deleteMany({
    where: { feePaymentId },
  });

  await prisma.feePayment.update({
    where: { id: feePaymentId },
    data: {
      dueAmount: totalAmountDue,
      status: 'PENDING',
      hasOverDue: false,
      adjustedFeeAmount: totalAmountDue,
      discountAmount: 0,
      hasDiscount: false,
      discountReason: null,
    },
  });

  const studentId = feePayment.studentTermFee?.studentId;
  if (studentId != null) {
    const allPayments = await prisma.feePayment.findMany({
      where: { studentTermFee: { studentId } },
      select: { dueAmount: true, status: true },
    });
    const currentInvoiceDue = allPayments.reduce((sum, p) => sum + (p.dueAmount ?? 0), 0);
    const overDueTotal = allPayments
      .filter((p) => p.status === 'OVERDUE')
      .reduce((sum, p) => sum + (p.dueAmount ?? 0), 0);
    await prisma.student.update({
      where: { id: studentId },
      data: {
        currentInvoiceDue,
        overDue: overDueTotal,
        hasOverDue: overDueTotal > 0,
      },
    });
  }

  console.log(`FeePayment id=${feePaymentId} (invoiceId=${feePayment.invoiceId}):`);
  console.log(`  Deleted ${deleted.count} payment transaction(s).`);
  console.log(`  Reset to total amount due: ${totalAmountDue}, status: PENDING.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
