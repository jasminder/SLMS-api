-- CreateTable
CREATE TABLE "SentClassworkSnapshot" (
    "id" SERIAL NOT NULL,
    "classworkId" INTEGER,
    "groupClassworkId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "attachments" TEXT[],
    "fileNames" TEXT[],
    "sendDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SentClassworkSnapshot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SentClassworkSnapshot" ADD CONSTRAINT "SentClassworkSnapshot_classworkId_fkey" FOREIGN KEY ("classworkId") REFERENCES "Classwork"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentClassworkSnapshot" ADD CONSTRAINT "SentClassworkSnapshot_groupClassworkId_fkey" FOREIGN KEY ("groupClassworkId") REFERENCES "GroupClasswork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
