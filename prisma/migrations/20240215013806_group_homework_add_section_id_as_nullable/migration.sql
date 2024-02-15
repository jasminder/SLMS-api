-- AlterTable
ALTER TABLE "GroupHomework" ADD COLUMN     "sectionId" INTEGER;

-- AddForeignKey
ALTER TABLE "GroupHomework" ADD CONSTRAINT "GroupHomework_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
