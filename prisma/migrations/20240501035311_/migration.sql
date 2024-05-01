/*
  Warnings:

  - Added the required column `invoiceId` to the `FeePayment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FeePayment" ADD COLUMN     "invoiceId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "currentInvoiceDue" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hasOverDue" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overDue" INTEGER NOT NULL DEFAULT 0;
