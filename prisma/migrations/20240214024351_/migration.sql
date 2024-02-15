-- DropForeignKey
ALTER TABLE "HomeworkSnapshot" DROP CONSTRAINT "HomeworkSnapshot_groupHomeworkId_fkey";

-- DropForeignKey
ALTER TABLE "HomeworkSnapshot" DROP CONSTRAINT "HomeworkSnapshot_homeworkId_fkey";

-- AddForeignKey
ALTER TABLE "HomeworkSnapshot" ADD CONSTRAINT "HomeworkSnapshot_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkSnapshot" ADD CONSTRAINT "HomeworkSnapshot_groupHomeworkId_fkey" FOREIGN KEY ("groupHomeworkId") REFERENCES "GroupHomework"("id") ON DELETE CASCADE ON UPDATE CASCADE;
