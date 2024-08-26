-- DropForeignKey
ALTER TABLE "AdminFeedbackOption" DROP CONSTRAINT "AdminFeedbackOption_categoryId_fkey";

-- AddForeignKey
ALTER TABLE "AdminFeedbackOption" ADD CONSTRAINT "AdminFeedbackOption_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FeedbackCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
