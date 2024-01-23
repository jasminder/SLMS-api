/*
  Warnings:

  - Made the column `logo` on table `Institution` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Institution" ALTER COLUMN "logo" SET NOT NULL;
