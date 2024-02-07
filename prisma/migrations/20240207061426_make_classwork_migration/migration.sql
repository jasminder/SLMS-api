/*
  Warnings:

  - Made the column `description` on table `Classwork` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `studentId` to the `GroupClasswork` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teacherId` to the `GroupClasswork` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Classwork" DROP CONSTRAINT "Classwork_termSubjectLevelId_fkey";

-- AlterTable
ALTER TABLE "Classwork" ADD COLUMN     "adminId" INTEGER,
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "termSubjectLevelId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "GroupClasswork" ADD COLUMN     "studentId" INTEGER NOT NULL,
ADD COLUMN     "teacherId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Classwork" ADD CONSTRAINT "Classwork_termSubjectLevelId_fkey" FOREIGN KEY ("termSubjectLevelId") REFERENCES "TermSubjectLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classwork" ADD CONSTRAINT "Classwork_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupClasswork" ADD CONSTRAINT "GroupClasswork_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupClasswork" ADD CONSTRAINT "GroupClasswork_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
