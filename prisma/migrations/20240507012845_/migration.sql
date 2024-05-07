/*
  Warnings:

  - Added the required column `sendDate` to the `EmailContent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EmailContent" ADD COLUMN     "sendDate" TIMESTAMP(3) NOT NULL;
