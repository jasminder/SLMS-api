/*
  Warnings:

  - A unique constraint covering the columns `[invoiceName,dueDate,groupName,interval]` on the table `FeeTemplate` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ', 'ERROR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentMethod" ADD VALUE 'CREDIT_CARD';
ALTER TYPE "PaymentMethod" ADD VALUE 'CASH';
ALTER TYPE "PaymentMethod" ADD VALUE 'OTHER';
ALTER TYPE "PaymentMethod" ADD VALUE 'CREDIT_BALANCE';

-- DropForeignKey
ALTER TABLE "FeePayment" DROP CONSTRAINT "FeePayment_feeTemplateId_fkey";

-- AlterTable
ALTER TABLE "FeePayment" ALTER COLUMN "createdAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "FeeTemplate" ADD COLUMN     "lastCronJobRun" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN     "className" TEXT,
ADD COLUMN     "classTime" TEXT,
ADD COLUMN     "roomName" TEXT,
ADD COLUMN     "sectionId" INTEGER;

-- AlterTable
ALTER TABLE "PaymentInstallment" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "errorDetails" TEXT,
ADD COLUMN     "isTransactionSucess" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "transactionId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "creditBalance" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "currentInvoiceDue" DROP DEFAULT,
ALTER COLUMN "overDue" DROP DEFAULT;

-- CreateTable
CREATE TABLE "StudentHomework" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "homeworkId" INTEGER NOT NULL,
    "submissionDate" TIMESTAMP(3),
    "grade" TEXT,
    "feedback" TEXT,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "attachments" TEXT[],
    "sendDate" TIMESTAMP(3),
    "classTime" TEXT,
    "roomName" TEXT,
    "className" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentHomework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentClasswork" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "classworkId" INTEGER NOT NULL,
    "submissionDate" TIMESTAMP(3),
    "grade" TEXT,
    "feedback" TEXT,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "attachments" TEXT[],
    "sendDate" TIMESTAMP(3),
    "classTime" TEXT,
    "roomName" TEXT,
    "className" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "StudentClasswork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailContent" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "emailcontent" TEXT NOT NULL,
    "sendDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "senderId" INTEGER NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
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
CREATE UNIQUE INDEX "StudentHomework_studentId_homeworkId_key" ON "StudentHomework"("studentId", "homeworkId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentClasswork_studentId_classworkId_key" ON "StudentClasswork"("studentId", "classworkId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAdminMessage_studentId_adminId_messageId_key" ON "StudentAdminMessage"("studentId", "adminId", "messageId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeTemplate_invoiceName_dueDate_groupName_interval_key" ON "FeeTemplate"("invoiceName", "dueDate", "groupName", "interval");

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_feeTemplateId_fkey" FOREIGN KEY ("feeTemplateId") REFERENCES "FeeTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHomework" ADD CONSTRAINT "StudentHomework_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHomework" ADD CONSTRAINT "StudentHomework_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentClasswork" ADD CONSTRAINT "StudentClasswork_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentClasswork" ADD CONSTRAINT "StudentClasswork_classworkId_fkey" FOREIGN KEY ("classworkId") REFERENCES "Classwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailContent" ADD CONSTRAINT "EmailContent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAdminMessage" ADD CONSTRAINT "StudentAdminMessage_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAdminMessage" ADD CONSTRAINT "StudentAdminMessage_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAdminMessage" ADD CONSTRAINT "StudentAdminMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
