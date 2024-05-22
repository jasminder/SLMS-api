/*
  Warnings:

  - Added the required column `updatedAt` to the `StudentHomework` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StudentClasswork" ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StudentHomework" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
