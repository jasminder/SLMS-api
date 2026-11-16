-- Scope of Work item 32 (record each edit to classwork and homework): ADDITIVE ONLY.
-- Creates one new table and one index. It does not alter, drop or rewrite any existing table or row.
-- Roll back by dropping the table.

-- CreateTable
CREATE TABLE "ClassRecordEdit" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "recordId" INTEGER NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "editorRole" TEXT NOT NULL,
    "editorUserId" INTEGER,
    "editorEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassRecordEdit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassRecordEdit_kind_recordId_idx" ON "ClassRecordEdit"("kind", "recordId");
