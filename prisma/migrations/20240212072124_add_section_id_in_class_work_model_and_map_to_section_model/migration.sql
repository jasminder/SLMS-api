-- AlterTable
ALTER TABLE "Classwork" ADD COLUMN     "sectionId" INTEGER;

-- AddForeignKey
ALTER TABLE "Classwork" ADD CONSTRAINT "Classwork_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
