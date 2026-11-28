-- BECS Direct Debit: weekly / monthly / quarterly debit runs, and editable email wording.
-- ADDITIVE ONLY: three enum values, four columns with defaults, one new (empty) table.
-- Existing settings are unchanged (frequency stays as it is).
-- Roll back (enum values cannot be dropped in PostgreSQL; they are harmless if unused):
--   ALTER TABLE "DirectDebitSettings" DROP COLUMN "runWeekday", DROP COLUMN "runMonthDay",
--     DROP COLUMN "runQuarterMonth", DROP COLUMN "lastReminderRunAt";

-- AlterEnum
ALTER TYPE "DirectDebitRunFrequency" ADD VALUE IF NOT EXISTS 'WEEKLY';
ALTER TYPE "DirectDebitRunFrequency" ADD VALUE IF NOT EXISTS 'MONTHLY';
ALTER TYPE "DirectDebitRunFrequency" ADD VALUE IF NOT EXISTS 'QUARTERLY';

-- AlterTable
ALTER TABLE "DirectDebitSettings" ADD COLUMN "runWeekday" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "runMonthDay" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "runQuarterMonth" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "lastReminderRunAt" TIMESTAMP(3);

-- Direct debit email wording (Administration > Direct Debit > Emails). Empty = built-in defaults are used.
-- Roll back: DROP TABLE "DirectDebitEmailTemplate";
CREATE TABLE "DirectDebitEmailTemplate" (
    "key" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,

    CONSTRAINT "DirectDebitEmailTemplate_pkey" PRIMARY KEY ("key")
);
