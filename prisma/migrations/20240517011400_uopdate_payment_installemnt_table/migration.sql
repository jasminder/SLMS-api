-- AlterTable
ALTER TABLE "PaymentInstallment" ADD COLUMN     "errorDetails" TEXT,
ADD COLUMN     "isTransactionSucess" BOOLEAN NOT NULL DEFAULT true;
