-- DropForeignKey
ALTER TABLE "FeePayment" DROP CONSTRAINT "FeePayment_feeTemplateId_fkey";

-- AlterTable
ALTER TABLE "PaymentInstallment" ADD COLUMN     "transactionId" TEXT;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_feeTemplateId_fkey" FOREIGN KEY ("feeTemplateId") REFERENCES "FeeTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
