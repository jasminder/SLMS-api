-- CreateTable
CREATE TABLE "Notice" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "adminId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoticeAcknowledgement" (
    "id" SERIAL NOT NULL,
    "noticeId" INTEGER NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "isSeen" BOOLEAN NOT NULL DEFAULT false,
    "seenAt" TIMESTAMP(3),

    CONSTRAINT "NoticeAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NoticeAcknowledgement_noticeId_teacherId_key" ON "NoticeAcknowledgement"("noticeId", "teacherId");

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeAcknowledgement" ADD CONSTRAINT "NoticeAcknowledgement_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeAcknowledgement" ADD CONSTRAINT "NoticeAcknowledgement_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
