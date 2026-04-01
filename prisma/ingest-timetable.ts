/**
 * Ingest school timetable(s) for students into the DB from a JSON file.
 * Each entry in the JSON array is one day's timetable (same shape as create-school-timetable API).
 * Creates Timetable + TimetableSlots, TimeSlots, ClassRooms and syncs TeacherClassAssignment.
 *
 * Usage:
 *   npx ts-node prisma/ingest-timetable.ts
 *   npm run ingest-timetable
 *
 * Optional env:
 *   TIMETABLE_INGEST_FILE - path to JSON file (default: prisma/timetable-ingest.json)
 *
 * JSON format: array of day timetables, each:
 *   {
 *     "day": "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY",
 *     "totalRooms": number,
 *     "roomNames": string[],
 *     "data": {
 *       "data": [
 *         {
 *           "startTime": "HH:mm" or "HH:mm:ss",
 *           "endTime": "HH:mm" or "HH:mm:ss",
 *           "rooms": [ { "teacherId": "id", "classId": "termSubjectLevelId-sectionId" }, ... ]
 *         }
 *       ]
 *     }
 *   }
 * Copy timetable-ingest.sample.json to timetable-ingest.json and fill with your data.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Day } from '@prisma/client';
import { createSchoolTimetable } from '../src/service/admin.service/admin.administration.service/admin.timetable.service/admin.timetable.service';
import { db } from '../src/utils/db.server';

const DEFAULT_FILE = path.join(__dirname, 'timetable-ingest.json');
const DAY_NAMES: Day[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

function getDayFromDate(date: Date): Day {
  return DAY_NAMES[date.getDay()];
}

function getDaysFromTodayToNextWeek(): Day[] {
  const days: Day[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // Include today + next 7 days (through same weekday next week).
  for (let i = 0; i <= 7; i++) {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() + i);
    days.push(getDayFromDate(d));
  }

  // Keep first occurrence order while avoiding duplicate weekday.
  const uniqueDays: Day[] = [];
  for (const day of days) {
    if (!uniqueDays.includes(day)) {
      uniqueDays.push(day);
    }
  }
  return uniqueDays;
}

async function main() {
  const filePath = process.env.TIMETABLE_INGEST_FILE || DEFAULT_FILE;
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolved)) {
    console.error(`Timetable ingest file not found: ${resolved}`);
    console.error('Copy prisma/timetable-ingest.sample.json to prisma/timetable-ingest.json and add your data.');
    process.exit(1);
  }

  const raw = fs.readFileSync(resolved, 'utf-8');
  let items: unknown[] = [];
  try {
    items = JSON.parse(raw);
  } catch (e) {
    console.error('Invalid JSON in timetable ingest file:', e);
    process.exit(1);
  }

  if (!Array.isArray(items)) {
    console.error('JSON file must be an array of day timetables.');
    process.exit(1);
  }

  const validDays: Day[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as Record<string, unknown>;
    const day = item?.day as string;
    if (!day || !validDays.includes(day as Day)) {
      console.error(`Entry ${i + 1}: missing or invalid "day". Must be one of: ${validDays.join(', ')}`);
      process.exit(1);
    }
    if (typeof item?.totalRooms !== 'number' || !Array.isArray(item?.roomNames) || !item?.data || typeof (item.data as Record<string, unknown>)?.data !== 'object') {
      console.error(`Entry ${i + 1} (${day}): must have totalRooms (number), roomNames (string[]), and data.data (array of time slots).`);
      process.exit(1);
    }
  }

  const currentTerm = await db.term.findFirst({
    where: { currentTerm: true },
    select: { id: true, name: true }
  });
  if (!currentTerm) {
    throw new Error('No current active term found. Please set a current term before timetable ingest.');
  }

  const activeStudentsCount = await db.student.count({
    where: {
      role: 'STUDENT',
      isActive: true,
      studentTermFee: { some: { termId: currentTerm.id } }
    }
  });
  if (activeStudentsCount === 0) {
    throw new Error(
      `No active students linked to current term "${currentTerm.name}" (id=${currentTerm.id}). ` +
        'Please ensure student-term linkage exists before ingesting timetable.'
    );
  }

  const requiredDays = getDaysFromTodayToNextWeek();
  const payloadByDay = new Map<Day, Parameters<typeof createSchoolTimetable>[0]>();
  for (const item of items) {
    const payload = item as Parameters<typeof createSchoolTimetable>[0];
    payloadByDay.set(payload.day as Day, payload);
  }

  const missingDays = requiredDays.filter((d) => !payloadByDay.has(d));
  if (missingDays.length > 0) {
    throw new Error(
      `Timetable file is missing required day(s) for today->next week window: ${missingDays.join(', ')}. ` +
        'Add these day payloads and retry.'
    );
  }

  // Validate class links: every classId must belong to current term and have active students assigned.
  for (const day of requiredDays) {
    const payload = payloadByDay.get(day)!;
    for (const slot of payload.data.data) {
      for (const room of slot.rooms) {
        const classId = room.classId?.trim();
        if (!classId) {
          continue;
        }

        const [termSubjectLevelIdRaw, sectionIdRaw] = classId.split('-');
        const termSubjectLevelId = Number(termSubjectLevelIdRaw);
        const sectionId = Number(sectionIdRaw);
        if (!Number.isInteger(termSubjectLevelId) || !Number.isInteger(sectionId)) {
          throw new Error(`Invalid classId "${classId}" for ${day} ${slot.startTime}-${slot.endTime}. Expected "termSubjectLevelId-sectionId".`);
        }

        const termSubjectLevel = await db.termSubjectLevel.findFirst({
          where: { id: termSubjectLevelId, termId: currentTerm.id },
          select: { id: true }
        });
        if (!termSubjectLevel) {
          throw new Error(
            `classId "${classId}" on ${day} is not linked to current term "${currentTerm.name}" (id=${currentTerm.id}).`
          );
        }

        const assignedActiveStudents = await db.studentClassAssignment.count({
          where: {
            termSubjectLevelId,
            sectionId,
            isCurrentlyAssigned: true,
            student: {
              role: 'STUDENT',
              isActive: true,
              studentTermFee: { some: { termId: currentTerm.id } }
            }
          }
        });

        if (assignedActiveStudents === 0) {
          throw new Error(
            `classId "${classId}" on ${day} has no currently assigned active students for current term "${currentTerm.name}".`
          );
        }
      }
    }
  }

  console.log(
    `Ingesting timetable for ${requiredDays.length} day(s) from today (${requiredDays[0]}) to next week (${requiredDays[requiredDays.length - 1]}) ` +
      `for current term "${currentTerm.name}" with ${activeStudentsCount} active student(s)...`
  );

  for (const day of requiredDays) {
    const payload = payloadByDay.get(day)!;
    const payloadDay = payload.day;
    try {
      const timetable = await createSchoolTimetable(payload);
      console.log(`  ${payloadDay}: created timetable id=${timetable?.id}`);
    } catch (err) {
      console.error(`  ${payloadDay}: failed`, err);
      throw err;
    }
  }

  console.log('Timetable ingest complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
