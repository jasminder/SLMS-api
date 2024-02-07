/*
  Warnings:

  - Added the required column `termSubjectLevelId` to the `Classwork` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Classwork" ADD COLUMN     "termSubjectLevelId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Homework" ADD COLUMN     "termSubjectLevelId" INTEGER;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_termSubjectLevelId_fkey" FOREIGN KEY ("termSubjectLevelId") REFERENCES "TermSubjectLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classwork" ADD CONSTRAINT "Classwork_termSubjectLevelId_fkey" FOREIGN KEY ("termSubjectLevelId") REFERENCES "TermSubjectLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
