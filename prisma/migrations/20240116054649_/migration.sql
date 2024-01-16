/*
  Warnings:

  - Added the required column `className` to the `SkipReport` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SkipReport" ADD COLUMN     "className" TEXT NOT NULL;
