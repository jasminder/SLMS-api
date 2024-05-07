-- CreateTable
CREATE TABLE "EmailContent" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "emailcontent" TEXT NOT NULL,

    CONSTRAINT "EmailContent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EmailContent" ADD CONSTRAINT "EmailContent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
