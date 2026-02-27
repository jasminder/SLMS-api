/**
 * Ingest student attendance for the last 2 days into the database.
 * Creates SchoolCheckInAttendance and ClassAttendance for all active students
 * (with current term fee and class assignments) for yesterday and the day before.
 *
 * If no active timetable exists for a weekday, creates one by cloning from an
 * existing timetable (so all weekdays have the same slots/classes).
 *
 * Usage (from SLMS-apis directory):
 *   npx ts-node prisma/ingest-attendance-last-2-days.ts
 *   npm run ingest-attendance-last-2-days
 *
 * Prerequisites:
 *   - Current term exists
 *   - At least one timetable with slots (termSubjectLevelId + sectionId) exists for any day,
 *     OR we will create a minimal timetable for each missing day using current term + first section
 *   - Active students with term fee and class assignments
 */

import { Day } from '@prisma/client';
import { db } from '../src/utils/db.server';
import { createSchoolCheckInAttendanceForStudent } from '../src/service/admin.service/admin.checkin.service/admin.checkin.service';

function getLastNDates(n: number): string[] {
  const dates: string[] = [];
  for (let i = 1; i <= n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function getDayFromDate(dateStr: string): Day {
  const d = new Date(dateStr + 'T12:00:00');
  const dayName = d.toLocaleString('en-us', { weekday: 'long' }).toUpperCase();
  return dayName as Day;
}

/**
 * Ensure an active timetable exists for the given day. If not, clone from another
 * timetable that has slots with termSubjectLevelId and sectionId, or create a minimal one.
 */
async function ensureTimetableForDay(day: Day): Promise<void> {
  const existing = await db.timetable.findFirst({
    where: { day, isActive: true },
    include: {
      timetableSlots: {
        where: {
          termSubjectLevelId: { not: null },
          sectionId: { not: null }
        },
        include: { timeSlot: true }
      }
    }
  });
  if (existing && existing.timetableSlots.length > 0) {
    return;
  }

  const currentTerm = await db.term.findFirst({ where: { currentTerm: true } });
  if (!currentTerm) {
    throw new Error('No current term found. Create a term and set currentTerm=true.');
  }

  // Find any timetable that has slots with class assignments (to clone structure)
  const sourceTimetable = await db.timetable.findFirst({
    where: {
      timetableSlots: {
        some: {
          termSubjectLevelId: { not: null },
          sectionId: { not: null }
                        }
      }
    },
    include: {
      timetableSlots: {
        where: {
          termSubjectLevelId: { not: null },
          sectionId: { not: null }
        },
        include: { timeSlot: true }
      }
    }
  });

  if (sourceTimetable && sourceTimetable.timetableSlots.length > 0) {
    // Clone: create new Timetable for this day and copy slots (same termSubjectLevelId, sectionId, timeSlot)
    await db.$transaction(async (tx) => {
      const newTimetable = await tx.timetable.create({
        data: {
          day,
          totalRooms: sourceTimetable.totalRooms,
          isActive: true,
          name: `${day}-${currentTerm.name}`
        }
      });
      for (const slot of sourceTimetable.timetableSlots) {
        await tx.timetableSlot.create({
          data: {
            timetableId: newTimetable.id,
            timeSlotId: slot.timeSlotId,
            termSubjectLevelId: slot.termSubjectLevelId!,
            sectionId: slot.sectionId!,
            classroomId: slot.classroomId ?? null,
            teacherId: slot.teacherId ?? null
          }
        });
      }
    });
    console.log(`Created timetable for ${day} by cloning existing timetable.`);
    return;
  }

  // No source timetable: create a minimal timetable using first class (StudentClassAssignment) in current term
  const assignment = await db.studentClassAssignment.findFirst({
    where: {
      isCurrentlyAssigned: true,
      termSubjectLevel: { termId: currentTerm.id }
    },
    select: { termSubjectLevelId: true, sectionId: true }
  });
  if (!assignment) {
    throw new Error('No StudentClassAssignment found for current term. Assign at least one student to a class.');
  }

  const timeSlot = await db.timeSlot.findFirst({ where: {} });
  let timeSlotId: number;
  if (timeSlot) {
    timeSlotId = timeSlot.id;
  } else {
    const start = new Date('1970-01-01T09:00:00');
    const end = new Date('1970-01-01T10:00:00');
    const created = await db.timeSlot.create({
      data: {
        timeRange: '9:00 AM - 10:00 AM',
        startTime: start,
        endTime: end
      }
    });
    timeSlotId = created.id;
  }

  await db.$transaction(async (tx) => {
    const newTimetable = await tx.timetable.create({
      data: {
        day,
        totalRooms: 1,
        isActive: true,
        name: `${day}-${currentTerm.name}`
      }
    });
    await tx.timetableSlot.create({
      data: {
        timetableId: newTimetable.id,
        timeSlotId,
        termSubjectLevelId: assignment.termSubjectLevelId,
        sectionId: assignment.sectionId
      }
    });
  });
  console.log(`Created minimal timetable for ${day} (1 slot).`);
}

async function main() {
  const last2Days = getLastNDates(2);
  console.log('Ingesting attendance for last 2 days:', last2Days);

  for (const dateStr of last2Days) {
    const day = getDayFromDate(dateStr);
    try {
      await ensureTimetableForDay(day);
      await createSchoolCheckInAttendanceForStudent(dateStr);
      console.log(`Created attendance for ${dateStr} (${day})`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('already exists') || message.includes('Attendance already')) {
        console.log(`Skipped ${dateStr}: attendance already exists`);
      } else if (message.includes('No active timetable')) {
        console.log(`Skipped ${dateStr}: no active timetable for that day`);
      } else {
        console.error(`Error creating attendance for ${dateStr}:`, message);
        throw err;
      }
    }
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
