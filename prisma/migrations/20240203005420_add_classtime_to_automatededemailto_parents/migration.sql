/*
  Warnings:

  - Added the required column `classTime` to the `AutomatedMailForParents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AutomatedMailForParents" ADD COLUMN     "classTime" TEXT NOT NULL;
