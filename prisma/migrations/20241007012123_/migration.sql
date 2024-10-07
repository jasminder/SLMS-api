/*
  Warnings:

  - Added the required column `endTime` to the `TimeSlot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `TimeSlot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `day` to the `Timetable` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Day" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- AlterTable
ALTER TABLE "TimeSlot" ADD COLUMN     "endTime" TIME NOT NULL,
ADD COLUMN     "startTime" TIME NOT NULL;

-- AlterTable
ALTER TABLE "Timetable" ADD COLUMN     "day" "Day" NOT NULL;
