/*
  Warnings:

  - A unique constraint covering the columns `[invoiceName,dueDate,groupName,interval]` on the table `FeeTemplate` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "FeeTemplate_invoiceName_dueDate_groupName_interval_key" ON "FeeTemplate"("invoiceName", "dueDate", "groupName", "interval");
