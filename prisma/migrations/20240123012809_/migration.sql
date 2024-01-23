/*
  Warnings:

  - Made the column `contactSecondary` on table `Institution` required. This step will fail if there are existing NULL values in that column.
  - Made the column `contactTertiary` on table `Institution` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Institution" ALTER COLUMN "contactSecondary" SET NOT NULL,
ALTER COLUMN "contactTertiary" SET NOT NULL;
