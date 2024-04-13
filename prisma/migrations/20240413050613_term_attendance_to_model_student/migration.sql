-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "termAttendance" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "attendancePercentageValue" DROP NOT NULL;
