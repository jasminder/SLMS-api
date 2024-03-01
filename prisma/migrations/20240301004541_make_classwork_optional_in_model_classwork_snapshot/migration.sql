-- DropForeignKey
ALTER TABLE "ClassworkSnapshot" DROP CONSTRAINT "ClassworkSnapshot_classworkId_fkey";

-- AlterTable
ALTER TABLE "ClassworkSnapshot" ALTER COLUMN "classworkId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ClassworkSnapshot" ADD CONSTRAINT "ClassworkSnapshot_classworkId_fkey" FOREIGN KEY ("classworkId") REFERENCES "Classwork"("id") ON DELETE SET NULL ON UPDATE CASCADE;
