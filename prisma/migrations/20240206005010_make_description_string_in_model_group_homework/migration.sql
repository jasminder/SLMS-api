/*
  Warnings:

  - The `description` column on the `GroupHomework` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "GroupHomework" DROP COLUMN "description",
ADD COLUMN     "description" TEXT[];
