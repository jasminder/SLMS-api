import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type NoticeSeed = {
  title: string;
  content: string;
};

type EventSeed = {
  title: string;
  location: string;
  start: Date;
  end: Date;
  type: string;
  color?: string;
};

function startOfDayPlus(daysFromToday: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const NOTICE_SEEDS: NoticeSeed[] = [
  {
    title: 'Uniform Inspection Reminder',
    content:
      'Uniform inspection will be held this Friday during first period. Please ensure complete and proper uniform.',
  },
  {
    title: 'PTM Schedule Published',
    content:
      'Parent-Teacher Meeting slots are now available. Please check with class teacher and confirm your slot.',
  },
  {
    title: 'Library Week Activities',
    content:
      'Library Week starts next Monday. Students are encouraged to participate in reading and storytelling activities.',
  },
];

const EVENT_SEEDS: EventSeed[] = [
  {
    title: 'Morning Assembly - Guest Talk',
    location: 'Main Hall',
    start: startOfDayPlus(1, 9, 0),
    end: startOfDayPlus(1, 10, 0),
    type: 'assembly',
    color: '#7C3AED',
  },
  {
    title: 'Science Exhibition',
    location: 'School Auditorium',
    start: startOfDayPlus(3, 11, 0),
    end: startOfDayPlus(3, 14, 0),
    type: 'event',
    color: '#2563EB',
  },
  {
    title: 'Sports Day Practice',
    location: 'School Ground',
    start: startOfDayPlus(5, 8, 30),
    end: startOfDayPlus(5, 10, 30),
    type: 'sports',
    color: '#059669',
  },
];

async function seedStudentNotices() {
  const admin = await prisma.admin.findFirst({ select: { id: true } });
  if (!admin) {
    console.log('No admin found. Skipping notices.');
    return;
  }

  const students = await prisma.student.findMany({
    where: { isActive: true, role: 'STUDENT', isAllowedLogin: true },
    select: { id: true },
    take: 50,
  });
  if (students.length === 0) {
    console.log('No active students found. Skipping notice acknowledgements.');
    return;
  }

  for (const notice of NOTICE_SEEDS) {
    const existing = await prisma.studentNotice.findFirst({
      where: { title: notice.title },
      select: { id: true },
    });

    const noticeId =
      existing?.id ??
      (
        await prisma.studentNotice.create({
          data: {
            adminId: admin.id,
            title: notice.title,
            content: notice.content,
          },
          select: { id: true },
        })
      ).id;

    for (const student of students) {
      await prisma.studentNoticeAcknowledgement.upsert({
        where: {
          studentNoticeId_studentId: {
            studentNoticeId: noticeId,
            studentId: student.id,
          },
        },
        create: {
          studentNoticeId: noticeId,
          studentId: student.id,
          isSeen: false,
        },
        update: {},
      });
    }
  }

  console.log(`Seeded/verified ${NOTICE_SEEDS.length} student notices.`);
}

async function seedEvents() {
  for (const event of EVENT_SEEDS) {
    const existing = await prisma.event.findFirst({
      where: { data: { is: { title: event.title } } },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.event.create({
      data: {
        start: event.start,
        end: event.end,
        data: {
          create: {
            title: event.title,
            location: event.location,
            type: event.type,
            color: event.color,
          },
        },
      },
    });
  }

  console.log(`Seeded/verified ${EVENT_SEEDS.length} events.`);
}

async function main() {
  console.log('Seeding dashboard notices/events...');
  await seedStudentNotices();
  await seedEvents();
  console.log('Done.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
