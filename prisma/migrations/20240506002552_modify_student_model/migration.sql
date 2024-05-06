-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "currentInvoiceDue" INTEGER DEFAULT 0,
ADD COLUMN     "hasOverDue" BOOLEAN DEFAULT false,
ADD COLUMN     "overDue" INTEGER DEFAULT 0;
