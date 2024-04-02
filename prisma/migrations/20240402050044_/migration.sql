-- DropForeignKey
ALTER TABLE "NoticeAcknowledgement" DROP CONSTRAINT "NoticeAcknowledgement_noticeId_fkey";

-- AddForeignKey
ALTER TABLE "NoticeAcknowledgement" ADD CONSTRAINT "NoticeAcknowledgement_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
