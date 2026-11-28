-- BECS Direct Debit settings (Administration > Direct Debit). ADDITIVE ONLY: two enums, two new tables, one settings row.
-- The settings row starts with direct debit SWITCHED OFF and access limited to selected families.
-- Roll back: DROP TABLE "DirectDebitFamilyAccess"; DROP TABLE "DirectDebitSettings";
--   DROP TYPE "DirectDebitRunFrequency"; DROP TYPE "DirectDebitAccess";

-- CreateEnum
CREATE TYPE "DirectDebitAccess" AS ENUM ('ALL_FAMILIES', 'SELECTED_FAMILIES');

-- CreateEnum
CREATE TYPE "DirectDebitRunFrequency" AS ENUM ('DAILY', 'WEEKDAYS');

-- CreateTable
CREATE TABLE "DirectDebitSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "access" "DirectDebitAccess" NOT NULL DEFAULT 'SELECTED_FAMILIES',
    "runTime" TEXT NOT NULL DEFAULT '07:00',
    "frequency" "DirectDebitRunFrequency" NOT NULL DEFAULT 'DAILY',
    "reminderDaysBefore" INTEGER NOT NULL DEFAULT 3,
    "allowPayExistingBalance" BOOLEAN NOT NULL DEFAULT true,
    "officeEmail" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "lastRunSummary" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,

    CONSTRAINT "DirectDebitSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectDebitFamilyAccess" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "addedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectDebitFamilyAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DirectDebitFamilyAccess_email_key" ON "DirectDebitFamilyAccess"("email");

-- The one settings row (switched off).
INSERT INTO "DirectDebitSettings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;
