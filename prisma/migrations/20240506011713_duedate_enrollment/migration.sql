-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "dueDate" DROP NOT NULL;
