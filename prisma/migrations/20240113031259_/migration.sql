-- AlterTable
ALTER TABLE "SchoolCheckInAttendance" ADD COLUMN     "checkedIn" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "checkInTime" DROP NOT NULL;
