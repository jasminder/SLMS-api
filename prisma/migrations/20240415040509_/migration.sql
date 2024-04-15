/*
  Warnings:

  - Made the column `color` on table `Appointment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isCompleted` on table `Appointment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `location` on table `Appointment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `Appointment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `address` on table `Appointment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `remarks` on table `Appointment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `type` on table `Appointment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "color" SET NOT NULL,
ALTER COLUMN "isCompleted" SET NOT NULL,
ALTER COLUMN "location" SET NOT NULL,
ALTER COLUMN "location" SET DEFAULT 'NA',
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'NA',
ALTER COLUMN "address" SET NOT NULL,
ALTER COLUMN "address" SET DEFAULT 'NA',
ALTER COLUMN "remarks" SET NOT NULL,
ALTER COLUMN "remarks" SET DEFAULT 'NA',
ALTER COLUMN "type" SET NOT NULL,
ALTER COLUMN "type" SET DEFAULT 'NA';
