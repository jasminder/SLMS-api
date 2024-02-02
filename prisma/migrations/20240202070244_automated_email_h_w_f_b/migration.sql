/*
  Warnings:

  - Added the required column `termSubjectLevelId` to the `Feedback` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN     "termSubjectLevelId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "GroupHomework" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "termSubjectLevelId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "attachments" TEXT[],
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "sendDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupHomework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomatedMailForParents" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "termSubjectLevelId" INTEGER NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "className" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "sendDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomatedMailForParents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutomatedMailForParents_studentId_termSubjectLevelId_sectio_key" ON "AutomatedMailForParents"("studentId", "termSubjectLevelId", "sectionId", "sendDate");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_termSubjectLevelId_fkey" FOREIGN KEY ("termSubjectLevelId") REFERENCES "TermSubjectLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupHomework" ADD CONSTRAINT "GroupHomework_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupHomework" ADD CONSTRAINT "GroupHomework_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupHomework" ADD CONSTRAINT "GroupHomework_termSubjectLevelId_fkey" FOREIGN KEY ("termSubjectLevelId") REFERENCES "TermSubjectLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomatedMailForParents" ADD CONSTRAINT "AutomatedMailForParents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomatedMailForParents" ADD CONSTRAINT "AutomatedMailForParents_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomatedMailForParents" ADD CONSTRAINT "AutomatedMailForParents_termSubjectLevelId_fkey" FOREIGN KEY ("termSubjectLevelId") REFERENCES "TermSubjectLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomatedMailForParents" ADD CONSTRAINT "AutomatedMailForParents_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
