/*
  Warnings:

  - A unique constraint covering the columns `[teacherId,termSubjectLevelId,sectionId]` on the table `TeacherSubjectAssignment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TeacherSubjectAssignment_teacherId_termSubjectLevelId_secti_key";

-- AlterTable
ALTER TABLE "TeacherSubjectAssignment" ALTER COLUMN "timeSlot" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSubjectAssignment_teacherId_termSubjectLevelId_secti_key" ON "TeacherSubjectAssignment"("teacherId", "termSubjectLevelId", "sectionId");
