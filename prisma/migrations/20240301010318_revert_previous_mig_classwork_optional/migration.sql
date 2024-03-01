/*
  Warnings:

  - Made the column `classworkId` on table `ClassworkSnapshot` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ClassworkSnapshot" DROP CONSTRAINT "ClassworkSnapshot_classworkId_fkey";

-- AlterTable
ALTER TABLE "ClassworkSnapshot" ALTER COLUMN "classworkId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "ClassworkSnapshot" ADD CONSTRAINT "ClassworkSnapshot_classworkId_fkey" FOREIGN KEY ("classworkId") REFERENCES "Classwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
