-- DropForeignKey
ALTER TABLE "NoticeAcknowledgement" DROP CONSTRAINT "NoticeAcknowledgement_teacherId_fkey";

-- AlterTable
ALTER TABLE "NoticeAcknowledgement" ADD COLUMN     "studentId" INTEGER,
ALTER COLUMN "teacherId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "NoticeAcknowledgement" ADD CONSTRAINT "NoticeAcknowledgement_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeAcknowledgement" ADD CONSTRAINT "NoticeAcknowledgement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
