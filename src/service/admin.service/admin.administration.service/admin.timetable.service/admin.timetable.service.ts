import { CreateSchoolTimetableSchema, TimeTableSchema, UpdateTimeTableSchema } from '../../../../schema/admin.dto/admin.timetable.dto/admin.timetable.dto';
import { customError } from '../../../../utils/customError';
import { db } from '../../../../utils/db.server';
import { Day } from '@prisma/client';

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
// ------------------- for school time table ------------------- //

export async function createSchoolTimetable(timetableData: CreateSchoolTimetableSchema['body']['createSchoolTimetableData']) {
    const { data, day, roomNames, totalRooms } = timetableData;
    console.log('timetableData at controller', JSON.stringify(timetableData, null, 2));
    const currentTerm = await db.term.findFirst({
        where: {
            currentTerm: true
        }
    });
    return db.$transaction(async (tx) => {
        // Deactivate existing active timetables for the same day
        await tx.timetable.updateMany({
            where: {
                day: day as Day,
                isActive: true
            },
            data: {
                isActive: false
            }
        });

        // Create the main Timetable entry
        const timetable = await tx.timetable.create({
            data: {
                day: day as Day,
                totalRooms: totalRooms,
                isActive: true,
                name: `${day}-${currentTerm?.name}`
            }
        });

        // Create ClassRooms
        const classrooms = await Promise.all(
            roomNames.map((name) =>
                tx.classRoom.create({
                    data: { name }
                })
            )
        );

        // Process each time slot
        for (const slot of data.data) {
            // Create TimeSlot
            const timeSlot = await tx.timeSlot.create({
                data: {
                    timeRange: `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`,
                    startTime: new Date(`1970-01-01T${slot.startTime}:00Z`),
                    endTime: new Date(`1970-01-01T${slot.endTime}:00Z`)
                }
            });

            // Create TimetableSlots for each room in the time slot
            for (let i = 0; i < slot.rooms.length; i++) {
                const room = slot.rooms[i];
                const [termSubjectLevelId, sectionId] = room.classId.split('-').map(Number);

                await tx.timetableSlot.create({
                    data: {
                        timetableId: timetable.id,
                        classroomId: classrooms[i].id,
                        timeSlotId: timeSlot.id,
                        termSubjectLevelId,
                        sectionId,
                        teacherId: parseInt(room.teacherId)
                    }
                });
            }
        }

        // Fetch the complete timetable with all related data
        const completeTimetable = await tx.timetable.findUnique({
            where: { id: timetable.id },
            include: {
                timetableSlots: {
                    include: {
                        classroom: true,
                        timeSlot: true,
                        termSubjectLevel: true,
                        section: true,
                        teacher: true
                    }
                }
            }
        });

        return completeTimetable;
    });
}

function formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}${minutes > 0 ? ':' + minutes.toString().padStart(2, '0') : ''} ${ampm}`;
}

interface Room {
    teacherName: string;
    className: string;
}

interface TimeSlot {
    startTime: string;
    endTime: string;
    timeRange: string;
    rooms: Room[];
}

interface TransformedTimetable {
    id: number;
    updatedAt: string;
    data: {
        data: TimeSlot[];
    };
    roomNames: string[];
    totalRooms: number;
    day: Day;
}

// ... existing code ...

export async function fetchActiveTimetable(day: Day): Promise<TransformedTimetable | null> {
    const timetable = await db.timetable.findFirst({
        where: {
            day: day,
            isActive: true
        },
        include: {
            timetableSlots: {
                include: {
                    classroom: true,
                    timeSlot: true,
                    termSubjectLevel: {
                        include: {
                            subject: true,
                            level: true
                        }
                    },
                    section: true,
                    teacher: {
                        include: {
                            teacherPersonalDetails: true
                        }
                    }
                }
            }
        }
    });

    if (!timetable) {
        return null;
    }

    const transformedData: TransformedTimetable = {
        id: timetable.id,
        updatedAt: timetable.updatedAt.toISOString(),
        data: {
            data: timetable.timetableSlots.reduce((acc: TimeSlot[], slot) => {
                const startTime = slot.timeSlot.startTime;
                const endTime = slot.timeSlot.endTime;

                const existingSlot = acc.find((s) => s.startTime === startTime.toISOString() && s.endTime === endTime.toISOString());

                const teacherName = `${slot.teacher.teacherPersonalDetails?.firstName} ${slot.teacher.teacherPersonalDetails?.lastName}`.trim();
                const className = `${slot.termSubjectLevel.subject.name} ${slot.termSubjectLevel.level.name} ${slot.section.name}`.trim();

                if (existingSlot) {
                    existingSlot.rooms.push({
                        teacherName,
                        className
                    });
                } else {
                    acc.push({
                        startTime: startTime.toISOString(),
                        endTime: endTime.toISOString(),
                        timeRange: `${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`,
                        rooms: [
                            {
                                teacherName,
                                className
                            }
                        ]
                    });
                }
                return acc;
            }, [])
        },
        roomNames: [...new Set(timetable.timetableSlots.map((slot) => slot.classroom.name))],
        totalRooms: timetable.totalRooms,
        day: timetable.day
    };

    return transformedData;
}
// ------------------- for school time table ------------------- //
