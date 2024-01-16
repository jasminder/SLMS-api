/*
  Warnings:

  - Made the column `adminClosingRemarks` on table `SkipReport` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "SkipReport" ALTER COLUMN "adminClosingRemarks" SET NOT NULL;
