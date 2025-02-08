-- CreateTable
CREATE TABLE "StudentTermAttendanceHistory" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "termId" INTEGER NOT NULL,
    "termName" TEXT NOT NULL,
    "termAttendance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentTermAttendanceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentTermAttendanceHistory_studentId_termId_key" ON "StudentTermAttendanceHistory"("studentId", "termId");

-- AddForeignKey
ALTER TABLE "StudentTermAttendanceHistory" ADD CONSTRAINT "StudentTermAttendanceHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermAttendanceHistory" ADD CONSTRAINT "StudentTermAttendanceHistory_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;
