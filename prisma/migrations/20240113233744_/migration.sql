-- AlterTable
ALTER TABLE "ClassAttendance" ALTER COLUMN "remarks" SET DEFAULT 'Absent-not checked in';

-- CreateTable
CREATE TABLE "SkipReport" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SkipReport_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SkipReport" ADD CONSTRAINT "SkipReport_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkipReport" ADD CONSTRAINT "SkipReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
