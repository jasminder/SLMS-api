/*
  Warnings:

  - You are about to drop the column `sectionid` on the `Homework` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Homework" DROP COLUMN "sectionid",
ADD COLUMN     "sectionId" INTEGER;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
