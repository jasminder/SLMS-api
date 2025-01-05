-- AlterTable
ALTER TABLE "Term" ADD COLUMN     "automatedAttendanceEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "_LevelToTermSubject" ADD CONSTRAINT "_LevelToTermSubject_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_LevelToTermSubject_AB_unique";

-- AlterTable
ALTER TABLE "_SectionToTermSubjectLevel" ADD CONSTRAINT "_SectionToTermSubjectLevel_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_SectionToTermSubjectLevel_AB_unique";

-- AlterTable
ALTER TABLE "_SubjectToTermSubjectGroup" ADD CONSTRAINT "_SubjectToTermSubjectGroup_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_SubjectToTermSubjectGroup_AB_unique";
