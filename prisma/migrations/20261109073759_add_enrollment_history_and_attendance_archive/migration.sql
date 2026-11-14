-- Issue 10 (student history is kept when a student leaves a subject): ADDITIVE ONLY.
-- Creates two NEW tables plus their indexes and foreign keys. It does not alter, drop or rewrite any existing table or row,
-- so it is safe on a database that already holds data and can be rolled back by dropping the two tables
-- (see docs/issue-9-10-enrolment-history.md).
--
-- NOTE: Prisma also offered "ALTER TABLE StudentClassAssignment ADD COLUMN migratedAt / migratedToAssignmentId". Those two
-- columns are in schema.prisma (and used by migrateClassAttendance) but were never created by an earlier migration - an
-- existing schema drift. They are deliberately NOT part of this migration: if the live database already has them (for
-- example from "prisma db push") adding them here would make this migration fail. See the report for the decision needed.

-- CreateTable
CREATE TABLE "EnrollmentHistory" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "enrollmentId" INTEGER NOT NULL,
    "subjectEnrollmentId" INTEGER,
    "termId" INTEGER NOT NULL,
    "termName" TEXT NOT NULL,
    "termSubjectGroupId" INTEGER NOT NULL,
    "groupName" TEXT NOT NULL,
    "termSubjectId" INTEGER,
    "subjectId" INTEGER,
    "subjectName" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedByUserId" INTEGER,
    "endedByEmail" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "studentRoleAtEnd" TEXT,
    "studentIsActiveAtEnd" BOOLEAN,
    "remainingInGroup" INTEGER,
    "classAssignments" JSONB,
    "attendanceArchivedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassAttendanceArchive" (
    "id" SERIAL NOT NULL,
    "enrollmentHistoryId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "classAttendanceId" INTEGER NOT NULL,
    "studentClassAssignmentId" INTEGER NOT NULL,
    "schoolCheckInAttendanceId" INTEGER NOT NULL,
    "schoolDayId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "attendanceStatus" "AttendanceStatus" NOT NULL,
    "remarks" TEXT,
    "termId" INTEGER,
    "termName" TEXT,
    "termSubjectLevelId" INTEGER,
    "subjectId" INTEGER,
    "subjectName" TEXT,
    "levelName" TEXT,
    "sectionId" INTEGER,
    "sectionName" TEXT,
    "assignmentWasCurrent" BOOLEAN,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassAttendanceArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentHistory_enrollmentId_key" ON "EnrollmentHistory"("enrollmentId");

-- CreateIndex
CREATE INDEX "EnrollmentHistory_studentId_idx" ON "EnrollmentHistory"("studentId");

-- CreateIndex
CREATE INDEX "EnrollmentHistory_studentId_termSubjectGroupId_endedAt_idx" ON "EnrollmentHistory"("studentId", "termSubjectGroupId", "endedAt");

-- CreateIndex
CREATE INDEX "EnrollmentHistory_termSubjectGroupId_endedAt_idx" ON "EnrollmentHistory"("termSubjectGroupId", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClassAttendanceArchive_classAttendanceId_key" ON "ClassAttendanceArchive"("classAttendanceId");

-- CreateIndex
CREATE INDEX "ClassAttendanceArchive_studentId_date_idx" ON "ClassAttendanceArchive"("studentId", "date");

-- CreateIndex
CREATE INDEX "ClassAttendanceArchive_enrollmentHistoryId_idx" ON "ClassAttendanceArchive"("enrollmentHistoryId");

-- AddForeignKey
ALTER TABLE "EnrollmentHistory" ADD CONSTRAINT "EnrollmentHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAttendanceArchive" ADD CONSTRAINT "ClassAttendanceArchive_enrollmentHistoryId_fkey" FOREIGN KEY ("enrollmentHistoryId") REFERENCES "EnrollmentHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAttendanceArchive" ADD CONSTRAINT "ClassAttendanceArchive_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
