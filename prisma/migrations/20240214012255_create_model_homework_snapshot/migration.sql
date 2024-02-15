-- CreateTable
CREATE TABLE "HomeworkSnapshot" (
    "id" SERIAL NOT NULL,
    "homeworkId" INTEGER NOT NULL,
    "groupHomeworkId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeworkSnapshot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HomeworkSnapshot" ADD CONSTRAINT "HomeworkSnapshot_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkSnapshot" ADD CONSTRAINT "HomeworkSnapshot_groupHomeworkId_fkey" FOREIGN KEY ("groupHomeworkId") REFERENCES "GroupHomework"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
