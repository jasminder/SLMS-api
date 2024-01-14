-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED', 'LATE');

-- CreateTable
CREATE TABLE "ClassAttendance" (
    "id" SERIAL NOT NULL,
    "studentClassAssignmentId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "attendanceStatus" "AttendanceStatus" NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "ClassAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassAttendance_studentClassAssignmentId_date_key" ON "ClassAttendance"("studentClassAssignmentId", "date");

-- AddForeignKey
ALTER TABLE "ClassAttendance" ADD CONSTRAINT "ClassAttendance_studentClassAssignmentId_fkey" FOREIGN KEY ("studentClassAssignmentId") REFERENCES "StudentClassAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAttendance" ADD CONSTRAINT "ClassAttendance_studentClassAssignmentId_date_fkey" FOREIGN KEY ("studentClassAssignmentId", "date") REFERENCES "SchoolCheckInAttendance"("studentId", "date") ON DELETE RESTRICT ON UPDATE CASCADE;
