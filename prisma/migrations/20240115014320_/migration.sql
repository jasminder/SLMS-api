/*
  Warnings:

  - A unique constraint covering the columns `[schoolCheckInAttendanceId]` on the table `ClassAttendance` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "ClassAttendance" DROP CONSTRAINT "ClassAttendance_studentClassAssignmentId_date_fkey";

-- DropForeignKey
ALTER TABLE "ClassAttendance" DROP CONSTRAINT "ClassAttendance_studentClassAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "SchoolCheckInAttendance" DROP CONSTRAINT "SchoolCheckInAttendance_studentId_fkey";

-- DropForeignKey
ALTER TABLE "SkipReport" DROP CONSTRAINT "SkipReport_studentId_fkey";

-- DropForeignKey
ALTER TABLE "SkipReport" DROP CONSTRAINT "SkipReport_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "StudentClassAssignment" DROP CONSTRAINT "StudentClassAssignment_enrollmentId_fkey";

-- DropForeignKey
ALTER TABLE "StudentClassAssignment" DROP CONSTRAINT "StudentClassAssignment_sectionId_fkey";

-- DropForeignKey
ALTER TABLE "StudentClassAssignment" DROP CONSTRAINT "StudentClassAssignment_studentId_fkey";

-- DropForeignKey
ALTER TABLE "StudentClassAssignment" DROP CONSTRAINT "StudentClassAssignment_termSubjectLevelId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_adminId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_studentId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_teacherId_fkey";

-- AlterTable
ALTER TABLE "ClassAttendance" ADD COLUMN     "schoolCheckInAttendanceId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "ClassAttendance_schoolCheckInAttendanceId_key" ON "ClassAttendance"("schoolCheckInAttendanceId");

-- AddForeignKey
ALTER TABLE "StudentClassAssignment" ADD CONSTRAINT "StudentClassAssignment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentClassAssignment" ADD CONSTRAINT "StudentClassAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentClassAssignment" ADD CONSTRAINT "StudentClassAssignment_termSubjectLevelId_fkey" FOREIGN KEY ("termSubjectLevelId") REFERENCES "TermSubjectLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentClassAssignment" ADD CONSTRAINT "StudentClassAssignment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolCheckInAttendance" ADD CONSTRAINT "SchoolCheckInAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAttendance" ADD CONSTRAINT "ClassAttendance_schoolCheckInAttendanceId_fkey" FOREIGN KEY ("schoolCheckInAttendanceId") REFERENCES "SchoolCheckInAttendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAttendance" ADD CONSTRAINT "ClassAttendance_studentClassAssignmentId_fkey" FOREIGN KEY ("studentClassAssignmentId") REFERENCES "StudentClassAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkipReport" ADD CONSTRAINT "SkipReport_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkipReport" ADD CONSTRAINT "SkipReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
