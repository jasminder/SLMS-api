-- AlterTable
ALTER TABLE "FeePayment" ADD COLUMN     "adjustedFeeAmount" INTEGER,
ADD COLUMN     "discountAmount" INTEGER DEFAULT 0,
ADD COLUMN     "discountReason" TEXT,
ADD COLUMN     "hasDiscount" BOOLEAN DEFAULT false,
ADD COLUMN     "hasDue" BOOLEAN DEFAULT true,
ADD COLUMN     "hasOverDue" BOOLEAN DEFAULT false,
ADD COLUMN     "invoiceId" TEXT DEFAULT '0000_0_0',
ADD COLUMN     "isActive" BOOLEAN DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3);
