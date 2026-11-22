-- One-off data fix, 22 Nov 2026: give Punjabi Jhnab 3 (termSubjectLevel 101, section 166) students every homework and
-- classwork posted for their class this term (from 25 Jan 2026). Items had never been sent, or were sent to Majha 1/2 by mistake.
-- Each row is dated to its own class day at 8:30 pm Sydney, the time the normal send uses. No notifications are sent.
-- Safe to run twice: rows a student already has are skipped (unique studentId + item).
-- Undo: delete the ids this script returned (saved in jhnab3-backfill-inserted-ids.json).

WITH roll AS (
  SELECT a."studentId" FROM "StudentClassAssignment" a JOIN "Student" s ON s.id = a."studentId"
  WHERE a."termSubjectLevelId" = 101 AND a."sectionId" = 166 AND a."isCurrentlyAssigned" AND s."isActive" AND s.role = 'STUDENT'
), items AS (
  SELECT h.id, (h."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date AS class_day
  FROM "Homework" h WHERE h."termSubjectLevelId" = 101 AND h."sectionId" = 166 AND h."createdAt" >= '2026-01-24 13:00'
)
INSERT INTO "StudentHomework" ("studentId", "homeworkId", "sendDate", "className", "roomName", "classTime", "submitted", "attachments", "createdAt", "updatedAt")
SELECT r."studentId", i.id, ((i.class_day + time '20:30') AT TIME ZONE 'Australia/Sydney') AT TIME ZONE 'UTC',
       'punjabi 5.Jhnab ਪੰਜਾਬੀ ਝਨਾਬ 3', 'ਪੱਛਮੀ', '10:00 am - 11:00 am', false, '{}', now(), now()
FROM roll r CROSS JOIN items i
ON CONFLICT ("studentId", "homeworkId") DO NOTHING
RETURNING id;

WITH roll AS (
  SELECT a."studentId" FROM "StudentClassAssignment" a JOIN "Student" s ON s.id = a."studentId"
  WHERE a."termSubjectLevelId" = 101 AND a."sectionId" = 166 AND a."isCurrentlyAssigned" AND s."isActive" AND s.role = 'STUDENT'
), items AS (
  SELECT c.id, (c."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date AS class_day
  FROM "Classwork" c WHERE c."termSubjectLevelId" = 101 AND c."sectionId" = 166 AND c."createdAt" >= '2026-01-24 13:00'
)
INSERT INTO "StudentClasswork" ("studentId", "classworkId", "sendDate", "className", "roomName", "classTime", "submitted", "attachments", "createdAt", "updatedAt")
SELECT r."studentId", i.id, ((i.class_day + time '20:30') AT TIME ZONE 'Australia/Sydney') AT TIME ZONE 'UTC',
       'punjabi 5.Jhnab ਪੰਜਾਬੀ ਝਨਾਬ 3', 'ਪੱਛਮੀ', '10:00 am - 11:00 am', false, '{}', now(), now()
FROM roll r CROSS JOIN items i
ON CONFLICT ("studentId", "classworkId") DO NOTHING
RETURNING id;
