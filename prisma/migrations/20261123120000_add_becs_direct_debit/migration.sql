-- BECS Direct Debit (Stripe). ADDITIVE ONLY: three enums, two tables, two new FeePayment columns with defaults.
-- No existing row value changes (directDebitInFlight defaults to false, directDebitReminderSentAt to NULL).
-- Roll back: DROP TABLE "DirectDebitCharge"; DROP TABLE "DirectDebitMandate";
--   DROP TYPE "DirectDebitChargeReason"; DROP TYPE "DirectDebitChargeStatus"; DROP TYPE "DirectDebitMandateStatus";
--   ALTER TABLE "FeePayment" DROP COLUMN "directDebitInFlight", DROP COLUMN "directDebitReminderSentAt";

-- CreateEnum
CREATE TYPE "DirectDebitMandateStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DirectDebitChargeStatus" AS ENUM ('PROCESSING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "DirectDebitChargeReason" AS ENUM ('SCHEDULED', 'SETUP_BALANCE');

-- AlterTable
ALTER TABLE "FeePayment" ADD COLUMN "directDebitInFlight" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "directDebitReminderSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DirectDebitMandate" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripePaymentMethodId" TEXT,
    "stripeMandateId" TEXT,
    "status" "DirectDebitMandateStatus" NOT NULL DEFAULT 'PENDING',
    "bsbNumber" TEXT,
    "bankLast4" TEXT,
    "mandateUrl" TEXT,
    "activatedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "statusChangedBy" TEXT,
    "statusReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectDebitMandate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectDebitCharge" (
    "id" SERIAL NOT NULL,
    "mandateId" INTEGER NOT NULL,
    "feePaymentId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "DirectDebitChargeReason" NOT NULL,
    "status" "DirectDebitChargeStatus" NOT NULL DEFAULT 'PROCESSING',
    "stripePaymentIntentId" TEXT,
    "failureMessage" TEXT,
    "disputed" BOOLEAN NOT NULL DEFAULT false,
    "officeAcknowledgedAt" TIMESTAMP(3),
    "officeAcknowledgedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectDebitCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DirectDebitMandate_userId_key" ON "DirectDebitMandate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectDebitMandate_stripeMandateId_key" ON "DirectDebitMandate"("stripeMandateId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectDebitCharge_stripePaymentIntentId_key" ON "DirectDebitCharge"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "DirectDebitCharge_feePaymentId_idx" ON "DirectDebitCharge"("feePaymentId");

-- CreateIndex
CREATE INDEX "DirectDebitCharge_status_idx" ON "DirectDebitCharge"("status");

-- AddForeignKey
ALTER TABLE "DirectDebitMandate" ADD CONSTRAINT "DirectDebitMandate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectDebitCharge" ADD CONSTRAINT "DirectDebitCharge_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "DirectDebitMandate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
