/*
  Warnings:

  - You are about to drop the column `sectionId` on the `GroupHomework` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "GroupHomework" DROP CONSTRAINT "GroupHomework_sectionId_fkey";

-- AlterTable
ALTER TABLE "GroupHomework" DROP COLUMN "sectionId",
ALTER COLUMN "homeworkId" DROP NOT NULL;
