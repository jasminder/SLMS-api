-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "sectionId" INTEGER,
ADD COLUMN     "termSubjectLevelId" INTEGER;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_termSubjectLevelId_fkey" FOREIGN KEY ("termSubjectLevelId") REFERENCES "TermSubjectLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
