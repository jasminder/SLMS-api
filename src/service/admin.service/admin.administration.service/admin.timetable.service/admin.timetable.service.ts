import { TimeTableSchema, UpdateTimeTableSchema } from '../../../../schema/admin.dto/admin.timetable.dto/admin.timetable.dto';
import { customError } from '../../../../utils/customError';
import { db } from '../../../../utils/db.server';

export async function createTimetable(createTimetableData: TimeTableSchema['body']) {
    // Start a transaction
    const totalRooms = createTimetableData.createTimetableData.totalRooms;
    const roomNames = createTimetableData.createTimetableData.roomNames;
    const data = createTimetableData.createTimetableData.data;

    const newTimetable = await db.$transaction(async (prisma) => {
        await prisma.timeTable.updateMany({
            data: { isActive: false }
        });
        const currentTerm = await db.term.findFirst({
            where: {
                currentTerm: true
            }
        });

        const newTimeTable = await prisma.timeTable.create({
            data: {
                data: data,
                name: `${currentTerm?.name}`,
                isActive: currentTerm?.currentTerm,
                termId: currentTerm?.id,
                roomNames,
                totalRooms
            }
        });

        return newTimeTable;
    });
    return newTimetable;
}

export async function findActiveTimetable() {
    const timetable = await db.timeTable.findFirst({
        where: { isActive: true }
    });

    return timetable;
}

export async function updateTimetable(id: UpdateTimeTableSchema['params']['id'], editTimetableData: UpdateTimeTableSchema['body']) {
    const existingTimeTable = await db.timeTable.findUnique({
        where: {
            id: +id
        }
    });

    if (!existingTimeTable) {
        throw customError(`Timetable with ID ${id} not found`, 'fail', 404, true);
    }
    const totalRooms = editTimetableData.totalRooms;
    const roomNames = editTimetableData.roomNames;
    const data = editTimetableData.data;
    const updatedTimeTable = await db.timeTable.update({
        where: {
            id: +id
        },
        data: {
            data,
            roomNames,
            totalRooms
        }
    });

    return updatedTimeTable;
}
// ------------------- for time table ------------------- //

// ------------------- for time table ------------------- //
// const studentTimetable = await db.student.findUnique({
//     where: { id: studentId },  // replace studentId with actual student's ID
//     include: {
//       studentClassAssignment: {
//         include: {
//           section: {
//             include: {
//               timetableSlot: {
//                 include: {
//                   timeSlot: true,
//                   classRoom: true
//                 }
//               }
//             }
//           },
//           termSubjectLevel: {
//             include: {
//               timetableSlot: {
//                 include: {
//                   timeSlot: true,
//                   classRoom: true
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   });
