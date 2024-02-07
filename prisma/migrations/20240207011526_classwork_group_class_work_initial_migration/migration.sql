-- CreateTable
CREATE TABLE "Classwork" (
    "id" SERIAL NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "teacherId" INTEGER,
    "uploadedUserRole" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'No title',
    "description" TEXT,
    "attachments" TEXT[],
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupClasswork" (
    "id" SERIAL NOT NULL,
    "termSubjectLevelId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT[],
    "attachments" TEXT[],
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "sendDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupClasswork_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Classwork" ADD CONSTRAINT "Classwork_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classwork" ADD CONSTRAINT "Classwork_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupClasswork" ADD CONSTRAINT "GroupClasswork_termSubjectLevelId_fkey" FOREIGN KEY ("termSubjectLevelId") REFERENCES "TermSubjectLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
