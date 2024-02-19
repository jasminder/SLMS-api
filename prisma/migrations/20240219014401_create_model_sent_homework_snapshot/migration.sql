-- CreateTable
CREATE TABLE "SentHomeworkSnapshot" (
    "id" SERIAL NOT NULL,
    "homeworkId" INTEGER,
    "groupHomeworkId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "attachments" TEXT[],
    "fileNames" TEXT[],
    "sendDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SentHomeworkSnapshot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SentHomeworkSnapshot" ADD CONSTRAINT "SentHomeworkSnapshot_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentHomeworkSnapshot" ADD CONSTRAINT "SentHomeworkSnapshot_groupHomeworkId_fkey" FOREIGN KEY ("groupHomeworkId") REFERENCES "GroupHomework"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
