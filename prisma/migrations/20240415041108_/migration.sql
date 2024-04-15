/*
  Warnings:

  - Made the column `color` on table `Appointment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isCompleted` on table `Appointment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `location` on table `Appointment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "color" SET NOT NULL,
ALTER COLUMN "color" DROP DEFAULT,
ALTER COLUMN "isCompleted" SET NOT NULL,
ALTER COLUMN "location" SET NOT NULL,
ALTER COLUMN "location" DROP DEFAULT,
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "address" DROP DEFAULT,
ALTER COLUMN "remarks" DROP DEFAULT,
ALTER COLUMN "type" DROP DEFAULT;
