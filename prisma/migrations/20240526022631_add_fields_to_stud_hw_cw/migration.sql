-- AlterTable
ALTER TABLE "StudentClasswork" ADD COLUMN     "className" TEXT,
ADD COLUMN     "classTime" TEXT,
ADD COLUMN     "roomName" TEXT,
ADD COLUMN     "sendDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StudentHomework" ADD COLUMN     "className" TEXT,
ADD COLUMN     "classTime" TEXT,
ADD COLUMN     "roomName" TEXT,
ADD COLUMN     "sendDate" TIMESTAMP(3);
