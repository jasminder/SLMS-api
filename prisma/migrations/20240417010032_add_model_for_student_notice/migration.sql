-- CreateTable
CREATE TABLE "StudentNotice" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "adminId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentNoticeAcknowledgement" (
    "id" SERIAL NOT NULL,
    "studentNoticeId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "isSeen" BOOLEAN NOT NULL DEFAULT false,
    "seenAt" TIMESTAMP(3),

    CONSTRAINT "StudentNoticeAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentNoticeAcknowledgement_studentNoticeId_studentId_key" ON "StudentNoticeAcknowledgement"("studentNoticeId", "studentId");

-- AddForeignKey
ALTER TABLE "StudentNotice" ADD CONSTRAINT "StudentNotice_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentNoticeAcknowledgement" ADD CONSTRAINT "StudentNoticeAcknowledgement_studentNoticeId_fkey" FOREIGN KEY ("studentNoticeId") REFERENCES "StudentNotice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentNoticeAcknowledgement" ADD CONSTRAINT "StudentNoticeAcknowledgement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
