-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('EMAIL', 'MEETING', 'PHONE_CALL', 'MESSAGE', 'CONFERENCE', 'OTHER');

-- CreateTable
CREATE TABLE "Interaction" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "interactionType" "InteractionType" NOT NULL,
    "description" TEXT,
    "contactedDate" TIMESTAMP(3) NOT NULL,
    "contactedBy" TIMESTAMP(3) NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
