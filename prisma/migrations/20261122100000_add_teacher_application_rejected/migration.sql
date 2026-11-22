-- Teacher application "Rejected" status: ADDITIVE ONLY.
-- Adds one nullable column to Teacher. NULL = not rejected, so every existing teacher and application is unchanged.
-- Set when an admin rejects a pending application (the application is kept); cleared by "Undo reject".
-- Roll back by dropping the column.

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN "rejectedAt" TIMESTAMP(3);
