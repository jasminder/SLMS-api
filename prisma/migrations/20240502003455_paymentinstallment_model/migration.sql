/*
  Warnings:

  - You are about to drop the column `amountPaid` on the `FeePayment` table. All the data in the column will be lost.
  - You are about to drop the column `method` on the `FeePayment` table. All the data in the column will be lost.
  - You are about to drop the column `paidDate` on the `FeePayment` table. All the data in the column will be lost.
  - You are about to drop the column `receivedBy` on the `FeePayment` table. All the data in the column will be lost.
  - You are about to drop the column `remarks` on the `FeePayment` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `FeePayment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FeePayment" DROP COLUMN "amountPaid",
DROP COLUMN "method",
DROP COLUMN "paidDate",
DROP COLUMN "receivedBy",
DROP COLUMN "remarks",
DROP COLUMN "status";

-- CreateTable
CREATE TABLE "PaymentInstallment" (
    "id" SERIAL NOT NULL,
    "feePaymentId" INTEGER NOT NULL,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "paidDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'NA',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT NOT NULL DEFAULT 'No remarks',
    "receivedBy" TEXT,

    CONSTRAINT "PaymentInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentInstallment_feePaymentId_idx" ON "PaymentInstallment"("feePaymentId");

-- AddForeignKey
ALTER TABLE "PaymentInstallment" ADD CONSTRAINT "PaymentInstallment_feePaymentId_fkey" FOREIGN KEY ("feePaymentId") REFERENCES "FeePayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
