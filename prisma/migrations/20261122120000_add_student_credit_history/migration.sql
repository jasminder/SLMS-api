-- Scope of Work B4: credit history. ADDITIVE ONLY: one new table and one enum. No existing column or row is changed.
-- The INSERT at the end records each student's CURRENT credit as an "opening balance" entry, so the history adds
-- up to today's balance from the first day. Student."creditBalance" itself is not touched.
-- Roll back: DROP TABLE "StudentCreditEntry"; DROP TYPE "CreditEntryKind";

-- CreateEnum
CREATE TYPE "CreditEntryKind" AS ENUM ('OPENING_BALANCE', 'ADDED', 'OVERPAYMENT', 'APPLIED_TO_INVOICE', 'CORRECTION');

-- CreateTable
CREATE TABLE "StudentCreditEntry" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "kind" "CreditEntryKind" NOT NULL,
    "paymentMethod" "PaymentMethod",
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "feePaymentId" INTEGER,
    "paymentInstallmentId" INTEGER,
    "createdByUserId" INTEGER,
    "createdByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentCreditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentCreditEntry_studentId_createdAt_idx" ON "StudentCreditEntry"("studentId", "createdAt");

-- AddForeignKey
ALTER TABLE "StudentCreditEntry" ADD CONSTRAINT "StudentCreditEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Opening balances: one entry per student who holds credit today (23 students, $4,090 on 22 Nov 2026).
INSERT INTO "StudentCreditEntry" ("studentId", "amount", "balanceAfter", "kind", "note", "createdByEmail")
SELECT "id", "creditBalance", "creditBalance", 'OPENING_BALANCE', 'Balance before credit history started (where it came from was not recorded)', 'System'
FROM "Student" WHERE "creditBalance" <> 0;
