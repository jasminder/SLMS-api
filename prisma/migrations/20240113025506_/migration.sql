-- CreateTable
CREATE TABLE "SchoolCheckInAttendance" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "checkInTime" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "SchoolCheckInAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolCheckInAttendance_studentId_date_key" ON "SchoolCheckInAttendance"("studentId", "date");

-- AddForeignKey
ALTER TABLE "SchoolCheckInAttendance" ADD CONSTRAINT "SchoolCheckInAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
