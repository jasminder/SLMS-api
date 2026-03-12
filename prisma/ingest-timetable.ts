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
import { createSchoolTimetable } from '../src/service/admin.service/admin.administration.service/admin.timetable.service/admin.timetable.service';

const DEFAULT_FILE = path.join(__dirname, 'timetable-ingest.sample.json');

async function main() {
  const filePath = process.env.TIMETABLE_INGEST_FILE || DEFAULT_FILE;
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolved)) {
    console.error(`Timetable ingest file not found: ${resolved}`);
    console.error('Copy prisma/timetable-ingest.sample.json to prisma/timetable-ingest.json and add your data.');
    process.exit(1);
  }

  const raw = fs.readFileSync(resolved, 'utf-8');
  let items: unknown[];
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

  const validDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as Record<string, unknown>;
    const day = item?.day as string;
    if (!day || !validDays.includes(day)) {
      console.error(`Entry ${i + 1}: missing or invalid "day". Must be one of: ${validDays.join(', ')}`);
      process.exit(1);
    }
    if (typeof item?.totalRooms !== 'number' || !Array.isArray(item?.roomNames) || !item?.data || typeof (item.data as Record<string, unknown>)?.data !== 'object') {
      console.error(`Entry ${i + 1} (${day}): must have totalRooms (number), roomNames (string[]), and data.data (array of time slots).`);
      process.exit(1);
    }
  }

  console.log(`Ingesting ${items.length} day(s) of timetable from ${resolved}...`);

  for (let i = 0; i < items.length; i++) {
    const payload = items[i] as Parameters<typeof createSchoolTimetable>[0];
    const day = payload.day;
    try {
      const timetable = await createSchoolTimetable(payload);
      console.log(`  ${day}: created timetable id=${timetable?.id}`);
    } catch (err) {
      console.error(`  ${day}: failed`, err);
      throw err;
    }
  }

  console.log('Timetable ingest complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
