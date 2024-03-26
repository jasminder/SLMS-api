-- AlterTable
ALTER TABLE "TermSubject" ADD COLUMN     "isOnSunday" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isOnWeekday" BOOLEAN NOT NULL DEFAULT false;
