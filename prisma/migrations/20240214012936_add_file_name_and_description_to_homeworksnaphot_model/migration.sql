/*
  Warnings:

  - Added the required column `description` to the `HomeworkSnapshot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HomeworkSnapshot" ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "fileNames" TEXT[];
