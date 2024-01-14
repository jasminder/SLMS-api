/*
  Warnings:

  - You are about to drop the `StudentClassHistory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "StudentClassHistory" DROP CONSTRAINT "StudentClassHistory_enrollmentId_fkey";

-- DropForeignKey
ALTER TABLE "StudentClassHistory" DROP CONSTRAINT "StudentClassHistory_sectionId_fkey";

-- DropForeignKey
ALTER TABLE "StudentClassHistory" DROP CONSTRAINT "StudentClassHistory_studentId_fkey";

-- DropForeignKey
ALTER TABLE "StudentClassHistory" DROP CONSTRAINT "StudentClassHistory_termSubjectLevelId_fkey";

-- DropTable
DROP TABLE "StudentClassHistory";

-- CreateTable
CREATE TABLE "StudentClassAssignment" (
    "id" SERIAL NOT NULL,
    "enrollmentId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "termSubjectLevelId" INTEGER NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "isCurrentlyAssigned" BOOLEAN NOT NULL DEFAULT true,
    "changeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "StudentClassAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentClassAssignment_studentId_termSubjectLevelId_isCurre_key" ON "StudentClassAssignment"("studentId", "termSubjectLevelId", "isCurrentlyAssigned", "sectionId");

-- AddForeignKey
ALTER TABLE "StudentClassAssignment" ADD CONSTRAINT "StudentClassAssignment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentClassAssignment" ADD CONSTRAINT "StudentClassAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentClassAssignment" ADD CONSTRAINT "StudentClassAssignment_termSubjectLevelId_fkey" FOREIGN KEY ("termSubjectLevelId") REFERENCES "TermSubjectLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentClassAssignment" ADD CONSTRAINT "StudentClassAssignment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
