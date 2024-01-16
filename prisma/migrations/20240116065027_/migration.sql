-- AlterTable
ALTER TABLE "SkipReport" ADD COLUMN     "adminId" INTEGER,
ALTER COLUMN "adminClosingRemarks" SET DEFAULT 'Admin closed report';
