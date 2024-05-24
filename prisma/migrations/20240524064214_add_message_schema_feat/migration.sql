-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('STUDENT', 'ADMIN');

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "senderId" INTEGER NOT NULL,
    "messageType" "MessageType" NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAdminMessage" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "adminId" INTEGER NOT NULL,
    "messageId" INTEGER NOT NULL,

    CONSTRAINT "StudentAdminMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentAdminMessage_studentId_adminId_messageId_key" ON "StudentAdminMessage"("studentId", "adminId", "messageId");

-- AddForeignKey
ALTER TABLE "StudentAdminMessage" ADD CONSTRAINT "StudentAdminMessage_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAdminMessage" ADD CONSTRAINT "StudentAdminMessage_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAdminMessage" ADD CONSTRAINT "StudentAdminMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
