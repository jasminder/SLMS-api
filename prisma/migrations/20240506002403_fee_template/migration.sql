-- AlterTable
ALTER TABLE "FeePayment" ADD COLUMN     "feeTemplateId" INTEGER;

-- CreateTable
CREATE TABLE "FeeTemplate" (
    "id" SERIAL NOT NULL,
    "invoiceName" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "termName" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT NOT NULL,
    "interval" "PaymentType" NOT NULL,
    "termId" INTEGER,
    "termSubjectGroupId" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeTemplate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_feeTemplateId_fkey" FOREIGN KEY ("feeTemplateId") REFERENCES "FeeTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeTemplate" ADD CONSTRAINT "FeeTemplate_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeTemplate" ADD CONSTRAINT "FeeTemplate_termSubjectGroupId_fkey" FOREIGN KEY ("termSubjectGroupId") REFERENCES "TermSubjectGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
