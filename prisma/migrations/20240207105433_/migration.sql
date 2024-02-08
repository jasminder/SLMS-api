/*
  Warnings:

  - A unique constraint covering the columns `[studentId,termSubjectLevelId,sectionId,sendDate,teacherId]` on the table `AutomatedMailForParents` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "AutomatedMailForParents_studentId_termSubjectLevelId_sectio_key";

-- CreateIndex
CREATE UNIQUE INDEX "AutomatedMailForParents_studentId_termSubjectLevelId_sectio_key" ON "AutomatedMailForParents"("studentId", "termSubjectLevelId", "sectionId", "sendDate", "teacherId");
