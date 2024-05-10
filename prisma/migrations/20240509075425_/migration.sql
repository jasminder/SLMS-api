-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'CREDIT_BALANCE';

-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "currentInvoiceDue" DROP DEFAULT,
ALTER COLUMN "overDue" DROP DEFAULT;
