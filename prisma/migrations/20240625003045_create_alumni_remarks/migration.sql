-- CreateTable
CREATE TABLE "AlumniRemarks" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "remarks" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlumniRemarks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AlumniRemarks" ADD CONSTRAINT "AlumniRemarks_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
