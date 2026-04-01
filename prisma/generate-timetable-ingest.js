const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

async function main() {
  const term = await prisma.term.findFirst({
    where: { currentTerm: true },
    select: { id: true, name: true },
  });
  if (!term) throw new Error('No current term found.');

  const pairs = await prisma.studentClassAssignment.groupBy({
    by: ['termSubjectLevelId', 'sectionId'],
    where: {
      isCurrentlyAssigned: true,
      student: {
        isActive: true,
        role: 'STUDENT',
        studentTermFee: { some: { termId: term.id } },
      },
    },
    _count: { _all: true },
  });
  if (pairs.length === 0) {
    throw new Error(`No active class assignments found for current term "${term.name}" (id=${term.id}).`);
  }

  const maxRooms = Math.min(3, pairs.length);
  const selected = pairs
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, maxRooms)
    .map((x) => `${x.termSubjectLevelId}-${x.sectionId}`);

  const template = {
    totalRooms: maxRooms,
    roomNames: Array.from({ length: maxRooms }, (_, i) => `Room ${i + 1}`),
    data: {
      data: [
        {
          startTime: '09:00',
          endTime: '10:00',
          rooms: selected.map((classId) => ({ teacherId: '', classId })),
        },
        {
          startTime: '10:00',
          endTime: '11:00',
          rooms: selected.map((classId) => ({ teacherId: '', classId })),
        },
      ],
    },
  };

  const payload = DAY_ORDER.map((day) => ({ day, ...template }));
  const outPath = path.join(__dirname, 'timetable-ingest.json');
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Generated ${outPath}`);
  console.log(`Current term: ${term.name} (id=${term.id})`);
  console.log(`Using classIds: ${selected.join(', ')}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
