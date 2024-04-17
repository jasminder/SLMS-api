/*
  Warnings:

  - You are about to drop the column `studentId` on the `NoticeAcknowledgement` table. All the data in the column will be lost.
  - Made the column `teacherId` on table `NoticeAcknowledgement` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "NoticeAcknowledgement" DROP CONSTRAINT "NoticeAcknowledgement_studentId_fkey";

-- DropForeignKey
ALTER TABLE "NoticeAcknowledgement" DROP CONSTRAINT "NoticeAcknowledgement_teacherId_fkey";

-- AlterTable
ALTER TABLE "NoticeAcknowledgement" DROP COLUMN "studentId",
ALTER COLUMN "teacherId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "NoticeAcknowledgement" ADD CONSTRAINT "NoticeAcknowledgement_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
