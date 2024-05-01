/*
  Warnings:

  - Added the required column `groupName` to the `FeeTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FeeTemplate" ADD COLUMN     "groupName" TEXT NOT NULL,
ADD COLUMN     "termId" INTEGER,
ADD COLUMN     "termSubjectGroupId" INTEGER;

-- AddForeignKey
ALTER TABLE "FeeTemplate" ADD CONSTRAINT "FeeTemplate_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeTemplate" ADD CONSTRAINT "FeeTemplate_termSubjectGroupId_fkey" FOREIGN KEY ("termSubjectGroupId") REFERENCES "TermSubjectGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
