-- AlterTable
ALTER TABLE "FeePayment" ALTER COLUMN "hasDue" SET DEFAULT false,
ALTER COLUMN "hasOverDue" SET DEFAULT false,
ALTER COLUMN "hasPaid" SET DEFAULT false;
