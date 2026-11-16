-- Scope of Work item 28 (teacher active status): ADDITIVE ONLY.
-- Adds one column to Teacher. Every existing teacher gets true, so nobody changes. It does not touch isActive (which means "approved teacher")
-- or isAllowedLogin. Roll back by dropping the column.

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN "isCurrentlyTeaching" BOOLEAN NOT NULL DEFAULT true;
