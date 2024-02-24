-- CreateTable
CREATE TABLE "FlagStudent" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "adminId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL,
    "openDate" TIMESTAMP(3) NOT NULL,
    "closeDate" TIMESTAMP(3),
    "adminRemarks" TEXT,

    CONSTRAINT "FlagStudent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FlagStudent" ADD CONSTRAINT "FlagStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlagStudent" ADD CONSTRAINT "FlagStudent_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
