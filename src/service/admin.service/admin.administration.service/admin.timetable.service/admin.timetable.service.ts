import { CreateSchoolTimetableSchema, TimeTableSchema, UpdateTimeTableSchema, UpdateSchoolTimetableSchema } from '../../../../schema/admin.dto/admin.timetable.dto/admin.timetable.dto';
import { customError } from '../../../../utils/customError';
import { db } from '../../../../utils/db.server';
import { Day, Prisma } from '@prisma/client';

/************* old time table json *************/
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
/************* old time table json *************/

// ------------------- for school time table ------------------- //

export async function createSchoolTimetable(timetableData: CreateSchoolTimetableSchema['body']['createSchoolTimetableData']) {
    const { data, day, roomNames, totalRooms } = timetableData;
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
            console.log("Raw slot data:", slot);
            console.log("endTime", slot.endTime);
            console.log("startTime", slot.startTime);
            
            let startTime, endTime;
            try {
                startTime = new Date(slot.startTime);
                endTime = new Date(slot.endTime);
                
                if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                    throw new Error('Invalid date');
                }
            } catch (error) {
                console.error("Error parsing dates:", error);
                console.error("startTime:", slot.startTime);
                console.error("endTime:", slot.endTime);
                throw new Error(`Invalid date format for start time (${slot.startTime}) or end time (${slot.endTime})`);
            }
            
            // Create TimeSlot
            const timeSlot = await tx.timeSlot.create({
                data: {
                    timeRange: `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`,
                    startTime,
                    endTime
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
    teacherName?: string;
    className?: string;
    teacherId?: number;
    classId?: string;
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
interface EditTransformedTimetable {
    id: number;
    updatedAt: string;
    data: {
        data: TimeSlot[];
    };
    roomNames: string[];
    totalRooms: number;
    day: Day;
}

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

export async function fetchEditTimetable(day: Day): Promise<EditTransformedTimetable | null> {
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

    const transformedData: EditTransformedTimetable = {
        id: timetable.id,
        updatedAt: timetable.updatedAt.toISOString(),
        data: {
            data: timetable.timetableSlots.reduce((acc: TimeSlot[], slot) => {
                const startTime = slot.timeSlot.startTime;
                const endTime = slot.timeSlot.endTime;

                const existingSlot = acc.find((s) => s.startTime === startTime.toISOString() && s.endTime === endTime.toISOString());

                const teacherName = `${slot.teacher.teacherPersonalDetails?.firstName} ${slot.teacher.teacherPersonalDetails?.lastName}`.trim();
                const className = `${slot.termSubjectLevel.subject.name} ${slot.termSubjectLevel.level.name} ${slot.section.name}`.trim();
                const teacherId = slot.teacher.id;
                const classId = `${slot.termSubjectLevelId}-${slot.sectionId}`;

                if (existingSlot) {
                    existingSlot.rooms.push({
                        teacherName,
                        className,
                        teacherId,
                        classId
                    });
                } else {
                    acc.push({
                        startTime: startTime.toISOString(),
                        endTime: endTime.toISOString(),
                        timeRange: `${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`,
                        rooms: [
                            {
                                teacherName,
                                className,
                                teacherId,
                                classId
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

export async function updateSchoolTimetable(timetableId: string, timetableData: UpdateSchoolTimetableSchema['body']['updateTimetableData']) {
    const { data, day, roomNames, totalRooms } = timetableData;
    console.log('timetableData', timetableData);
    try {
        const currentTerm = await db.term.findFirst({
            where: {
                currentTerm: true
            }
        });

        return await db.$transaction(async (tx) => {
            // Deactivate existing active timetables for the same day
            await tx.timetable.updateMany({
                where: {
                    day: day as Day,
                    isActive: true,
                    id: +timetableId
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
                console.log('endTime', slot.endTime);
                console.log('startTime', slot.startTime);
                // Create TimeSlot
                const timeSlot = await tx.timeSlot.create({
                    data: {
                        timeRange: `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`,
                        startTime: new Date(slot.startTime),
                        endTime: new Date(slot.endTime)
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
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // Handle known Prisma errors
            switch (error.code) {
                case 'P2002':
                    throw customError('A unique constraint violation occurred.', 'fail', 400, true);
                case 'P2025':
                    throw customError('Record not found.', 'fail', 404, true);
                default:
                    throw customError(`Database error: ${error.message}`, 'error', 500, true);
            }
        } else if (error instanceof Prisma.PrismaClientValidationError) {
            // Handle Prisma validation errors
            throw customError(`Validation error: ${error.message}`, 'fail', 400, true);
        } else {
            // Handle other types of errors
            if (error instanceof Error) {
                throw customError(`An unexpected error occurred: ${error.message}`, 'error', 500, true);
            }
            throw customError('An unexpected error occurred', 'error', 500, true);
        }
    }
}

// ------------------- for school time table ------------------- //
