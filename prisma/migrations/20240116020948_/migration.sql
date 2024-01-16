/*
  Warnings:

  - Made the column `schoolCheckInAttendanceId` on table `ClassAttendance` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ClassAttendance" DROP CONSTRAINT "ClassAttendance_schoolCheckInAttendanceId_fkey";

-- DropIndex
DROP INDEX "ClassAttendance_schoolCheckInAttendanceId_key";

-- AlterTable
ALTER TABLE "ClassAttendance" ALTER COLUMN "schoolCheckInAttendanceId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "ClassAttendance" ADD CONSTRAINT "ClassAttendance_schoolCheckInAttendanceId_fkey" FOREIGN KEY ("schoolCheckInAttendanceId") REFERENCES "SchoolCheckInAttendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
