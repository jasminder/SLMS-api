-- CreateTable
CREATE TABLE "FeedbackCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminFeedbackOption" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" INTEGER NOT NULL,

    CONSTRAINT "AdminFeedbackOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackCategory_name_key" ON "FeedbackCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AdminFeedbackOption_categoryId_label_key" ON "AdminFeedbackOption"("categoryId", "label");

-- AddForeignKey
ALTER TABLE "AdminFeedbackOption" ADD CONSTRAINT "AdminFeedbackOption_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FeedbackCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminFeedbackOption" ADD CONSTRAINT "AdminFeedbackOption_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
