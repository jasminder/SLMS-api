-- AlterTable
ALTER TABLE "GroupHomework" ADD COLUMN     "homeworkId" INTEGER;

-- AddForeignKey
ALTER TABLE "GroupHomework" ADD CONSTRAINT "GroupHomework_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;
