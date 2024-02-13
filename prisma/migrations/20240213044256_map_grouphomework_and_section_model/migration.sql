/*
  Warnings:

  - Added the required column `sectionId` to the `GroupHomework` table without a default value. This is not possible if the table is not empty.
  - Made the column `homeworkId` on table `GroupHomework` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "GroupHomework" ADD COLUMN     "sectionId" INTEGER NOT NULL,
ALTER COLUMN "homeworkId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "GroupHomework" ADD CONSTRAINT "GroupHomework_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
