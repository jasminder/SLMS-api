-- AlterTable
ALTER TABLE "ClassAttendance" ADD COLUMN     "schoolDayId" INTEGER;

-- AlterTable
ALTER TABLE "SchoolCheckInAttendance" ADD COLUMN     "schoolDayId" INTEGER;

-- CreateTable
CREATE TABLE "SchoolDay" (
    "id" SERIAL NOT NULL,
    "schoolOperatedDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolDay_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SchoolCheckInAttendance" ADD CONSTRAINT "SchoolCheckInAttendance_schoolDayId_fkey" FOREIGN KEY ("schoolDayId") REFERENCES "SchoolDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAttendance" ADD CONSTRAINT "ClassAttendance_schoolDayId_fkey" FOREIGN KEY ("schoolDayId") REFERENCES "SchoolDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;
