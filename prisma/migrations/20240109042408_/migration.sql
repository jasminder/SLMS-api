/*
  Warnings:

  - You are about to drop the `TeacherSubjectAssignment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TeacherSubjectAssignment" DROP CONSTRAINT "TeacherSubjectAssignment_sectionId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherSubjectAssignment" DROP CONSTRAINT "TeacherSubjectAssignment_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherSubjectAssignment" DROP CONSTRAINT "TeacherSubjectAssignment_termSubjectLevelId_fkey";

-- DropTable
DROP TABLE "TeacherSubjectAssignment";

-- CreateTable
CREATE TABLE "TeacherClassAssignment" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "termSubjectLevelId" INTEGER NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "timeSlot" TEXT,

    CONSTRAINT "TeacherClassAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherClassAssignment_teacherId_termSubjectLevelId_section_key" ON "TeacherClassAssignment"("teacherId", "termSubjectLevelId", "sectionId");

-- AddForeignKey
ALTER TABLE "TeacherClassAssignment" ADD CONSTRAINT "TeacherClassAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherClassAssignment" ADD CONSTRAINT "TeacherClassAssignment_termSubjectLevelId_fkey" FOREIGN KEY ("termSubjectLevelId") REFERENCES "TermSubjectLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherClassAssignment" ADD CONSTRAINT "TeacherClassAssignment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
