-- Scope of Work item 35 (email to a selected group of students): ADDITIVE ONLY.
-- Creates two NEW tables with their index and foreign key. It does not alter, drop or rewrite any existing table or row, and it
-- can be rolled back by dropping the two tables.

-- CreateTable
CREATE TABLE "BulkEmail" (
    "id" SERIAL NOT NULL,
    "sentByUserId" INTEGER,
    "sentByEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "templateId" INTEGER,
    "templateName" TEXT,
    "recipientMode" TEXT NOT NULL,
    "filters" JSONB,
    "studentCount" INTEGER NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedStudents" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "BulkEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkEmailRecipient" (
    "id" SERIAL NOT NULL,
    "bulkEmailId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "studentIds" INTEGER[],
    "studentNames" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "BulkEmailRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BulkEmail_createdAt_idx" ON "BulkEmail"("createdAt");

-- CreateIndex
CREATE INDEX "BulkEmailRecipient_bulkEmailId_status_idx" ON "BulkEmailRecipient"("bulkEmailId", "status");

-- AddForeignKey
ALTER TABLE "BulkEmailRecipient" ADD CONSTRAINT "BulkEmailRecipient_bulkEmailId_fkey" FOREIGN KEY ("bulkEmailId") REFERENCES "BulkEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
