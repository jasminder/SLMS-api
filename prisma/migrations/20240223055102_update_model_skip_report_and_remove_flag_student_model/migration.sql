/*
  Warnings:

  - You are about to drop the `FlagStudent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FlagStudent" DROP CONSTRAINT "FlagStudent_adminId_fkey";

-- DropForeignKey
ALTER TABLE "FlagStudent" DROP CONSTRAINT "FlagStudent_studentId_fkey";

-- AlterTable
ALTER TABLE "SkipReport" ADD COLUMN     "closeDate" TIMESTAMP(3);

-- DropTable
DROP TABLE "FlagStudent";

-- AddForeignKey
ALTER TABLE "SkipReport" ADD CONSTRAINT "SkipReport_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
