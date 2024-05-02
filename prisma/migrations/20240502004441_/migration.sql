/*
  Warnings:

  - You are about to drop the column `hasPaid` on the `FeePayment` table. All the data in the column will be lost.
  - Made the column `studentTermFeeId` on table `FeePayment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `feeAmount` on table `FeePayment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `feeTemplateId` on table `FeePayment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `invoiceId` on table `FeePayment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "FeePayment" DROP COLUMN "hasPaid",
ALTER COLUMN "studentTermFeeId" SET NOT NULL,
ALTER COLUMN "feeAmount" SET NOT NULL,
ALTER COLUMN "feeTemplateId" SET NOT NULL,
ALTER COLUMN "invoiceId" SET NOT NULL,
ALTER COLUMN "adjustedFeeAmount" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PaymentInstallment" ALTER COLUMN "paidDate" DROP NOT NULL,
ALTER COLUMN "paidDate" DROP DEFAULT;
