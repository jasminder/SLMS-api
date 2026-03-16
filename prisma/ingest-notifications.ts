/**
 * Ingest notification entries for mobile app testing.
 *
 * Creates sample notifications (FEE, HOMEWORK, ATTENDANCE, EVENT, etc.) for
 * existing active students so the app Notifications screen can be tested.
 *
 * Usage (from SLMS-apis directory):
 *   npx ts-node prisma/ingest-notifications.ts
 *   npm run ingest-notifications
 *
 * Prerequisites: At least one Student record in the database.
 */

import { PrismaClient, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

const SAMPLE_NOTIFICATIONS: Array<{
  type: NotificationType;
  title: string | null;
  content: string;
  isRead: boolean;
}> = [
  {
    type: 'FEE',
    title: 'Fee Payment Due',
    content: 'Term 1 fee payment is due by 15 March. Please pay at your earliest to avoid late fees.',
    isRead: false,
  },
  {
    type: 'FEEOVERDUE',
    title: 'Overdue Fee Reminder',
    content: 'Your term fee is overdue. Please complete the payment to continue classes.',
    isRead: false,
  },
  {
    type: 'HOMEWORK',
    title: 'New Homework Assigned',
    content: 'Punjabi homework has been assigned for next week. Complete Chapter 3 exercises (pages 45–48).',
    isRead: false,
  },
  {
    type: 'HOMEWORK',
    title: 'Homework Submitted',
    content: 'Your Kirtan practice submission has been received. Teacher will provide feedback soon.',
    isRead: true,
  },
  {
    type: 'ATTENDANCE',
    title: 'Attendance Alert',
    content: 'Your child was marked absent on the last class. Please inform the school if this was planned.',
    isRead: false,
  },
  {
    type: 'ATTENDANCE',
    title: 'Attendance Summary',
    content: 'Weekly attendance: 4/4 classes present. Keep up the great attendance!',
    isRead: true,
  },
  {
    type: 'EVENT',
    title: 'School Event',
    content: 'Vaisakhi celebration on 14 April. All students are encouraged to attend in traditional dress.',
    isRead: true,
  },
  {
    type: 'MESSAGE',
    title: 'Message from Admin',
    content: 'Parent–teacher meetings are scheduled for next week. Please book a slot via the portal.',
    isRead: false,
  },
  {
    type: 'CLASSWORK',
    title: 'Classwork Due',
    content: 'Gurmat classwork from last Sunday is due by next class. Submit via the app or in person.',
    isRead: false,
  },
  {
    type: 'FEEDBACK',
    title: 'Teacher Feedback',
    content: 'Good progress in Punjabi! Please practice Gurmukhi handwriting for the next assignment.',
    isRead: true,
  },
];

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(12, 0, 0, 0);
  return d;
}

async function main() {
  console.log('Fetching active students...');
  const students = await prisma.student.findMany({
    where: { isActive: true },
    select: { id: true },
    take: 20,
  });

  if (students.length === 0) {
    console.log('No active students found. Create at least one student (e.g. run seed or ingest-dummy-data) first.');
    process.exit(1);
  }

  console.log(`Found ${students.length} active student(s). Creating notifications...`);

  let created = 0;
  for (const { id: studentId } of students) {
    for (let i = 0; i < SAMPLE_NOTIFICATIONS.length; i++) {
      const sample = SAMPLE_NOTIFICATIONS[i];
      const createdAt = daysAgo(i % 7);
      await prisma.notification.create({
        data: {
          studentId,
          type: sample.type,
          title: sample.title,
          content: sample.content,
          isRead: sample.isRead,
          createdAt,
          updatedAt: createdAt,
        },
      });
      created++;
    }
  }

  console.log(`Created ${created} notification(s) for ${students.length} student(s).`);
  console.log('You can now test the Notifications screen in the mobile app.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
