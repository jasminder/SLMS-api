-- CreateTable
CREATE TABLE "FeeDashboard" (
    "id" SERIAL NOT NULL,
    "totalFeesInvoiced" INTEGER NOT NULL DEFAULT 0,
    "totalFeesPaid" INTEGER NOT NULL DEFAULT 0,
    "totalFeesDue" INTEGER NOT NULL DEFAULT 0,
    "totalFeesOverdue" INTEGER NOT NULL DEFAULT 0,
    "totalFeesOverduePrev" INTEGER NOT NULL DEFAULT 0,
    "termId" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeDashboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeeDashboard_termId_createdAt_key" ON "FeeDashboard"("termId", "createdAt");

-- AddForeignKey
ALTER TABLE "FeeDashboard" ADD CONSTRAINT "FeeDashboard_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
