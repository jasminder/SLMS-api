/*
  Warnings:

  - You are about to drop the column `isArchived` on the `Notification` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "isArchived",
ALTER COLUMN "title" DROP NOT NULL;
