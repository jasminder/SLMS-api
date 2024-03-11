/*
  Warnings:

  - Added the required column `appliedById` to the `Leave` table without a default value. This is not possible if the table is not empty.
  - Added the required column `appliedByRole` to the `Leave` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Leave` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Leave" ADD COLUMN     "appliedById" INTEGER NOT NULL,
ADD COLUMN     "appliedByRole" "Role" NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
