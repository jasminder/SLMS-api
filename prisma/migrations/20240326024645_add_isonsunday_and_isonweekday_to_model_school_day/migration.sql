-- AlterTable
ALTER TABLE "SchoolDay" ADD COLUMN     "isOnSunday" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isOnWeekday" BOOLEAN NOT NULL DEFAULT false;
