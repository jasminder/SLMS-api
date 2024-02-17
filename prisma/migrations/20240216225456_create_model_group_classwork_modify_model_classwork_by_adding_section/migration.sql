-- AlterTable
ALTER TABLE "GroupClasswork" ADD COLUMN     "sectionId" INTEGER;

-- CreateTable
CREATE TABLE "ClassworkSnapshot" (
    "id" SERIAL NOT NULL,
    "classworkId" INTEGER NOT NULL,
    "groupClassworkId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "attachments" TEXT[],
    "fileNames" TEXT[],
    "sendDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassworkSnapshot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GroupClasswork" ADD CONSTRAINT "GroupClasswork_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassworkSnapshot" ADD CONSTRAINT "ClassworkSnapshot_classworkId_fkey" FOREIGN KEY ("classworkId") REFERENCES "Classwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassworkSnapshot" ADD CONSTRAINT "ClassworkSnapshot_groupClassworkId_fkey" FOREIGN KEY ("groupClassworkId") REFERENCES "GroupClasswork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
