/*
  Warnings:

  - You are about to drop the column `feeId` on the `FeePayment` table. All the data in the column will be lost.
  - Added the required column `adjustedFeeAmount` to the `FeePayment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FeePayment" DROP CONSTRAINT "FeePayment_feeId_fkey";

-- AlterTable
ALTER TABLE "FeePayment" DROP COLUMN "feeId",
ADD COLUMN     "adjustedFeeAmount" INTEGER NOT NULL,
ADD COLUMN     "discountAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discountReason" TEXT,
ADD COLUMN     "hasDiscount" BOOLEAN NOT NULL DEFAULT false;
