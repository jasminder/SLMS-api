/*
  Warnings:

  - Added the required column `hasDue` to the `FeePayment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hasOverDue` to the `FeePayment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hasPaid` to the `FeePayment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FeePayment" ADD COLUMN     "feeTemplateId" INTEGER,
ADD COLUMN     "hasDue" SET DEFAULT false,
ADD COLUMN     "hasOverDue" SET DEFAULT false,
ADD COLUMN     "hasPaid" SET DEFAULT false;;

-- CreateTable
CREATE TABLE "FeeTemplate" (
    "id" SERIAL NOT NULL,
    "invoiceName" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "termName" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT NOT NULL,
    "interval" "PaymentType" NOT NULL,

    CONSTRAINT "FeeTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeDashboard" (
    "id" SERIAL NOT NULL,
    "totalFeesInvoiced" INTEGER NOT NULL DEFAULT 0,
    "totalFeesPaid" INTEGER NOT NULL DEFAULT 0,
    "totalFeesDue" INTEGER NOT NULL DEFAULT 0,
    "totalFeesOverdue" INTEGER NOT NULL DEFAULT 0,
    "totalFeesOverduePrev" INTEGER NOT NULL DEFAULT 0,
    "termId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeDashboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeeDashboard_termId_createdAt_key" ON "FeeDashboard"("termId", "createdAt");

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_feeTemplateId_fkey" FOREIGN KEY ("feeTemplateId") REFERENCES "FeeTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeDashboard" ADD CONSTRAINT "FeeDashboard_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
