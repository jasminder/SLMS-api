-- Scope of Work item 20, B5 (fee exemption between two dates): ADDITIVE ONLY.
-- Creates one new table, one index and one foreign key to Student. It does not alter, drop or rewrite any existing table or row.
-- Roll back by dropping the table.

-- CreateTable
CREATE TABLE "FeeExemption" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" INTEGER,
    "createdByEmail" TEXT,
    "endedAt" TIMESTAMP(3),
    "endedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeExemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeeExemption_studentId_isActive_idx" ON "FeeExemption"("studentId", "isActive");

-- AddForeignKey
ALTER TABLE "FeeExemption" ADD CONSTRAINT "FeeExemption_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
