/*
  Warnings:

  - You are about to drop the column `homeworkId` on the `GroupHomework` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "GroupHomework" DROP CONSTRAINT "GroupHomework_homeworkId_fkey";

-- AlterTable
ALTER TABLE "GroupHomework" DROP COLUMN "homeworkId";
