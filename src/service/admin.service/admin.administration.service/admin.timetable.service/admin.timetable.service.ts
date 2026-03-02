import { CreateSchoolTimetableSchema, TimeTableSchema, UpdateTimeTableSchema, UpdateSchoolTimetableSchema } from '../../../../schema/admin.dto/admin.timetable.dto/admin.timetable.dto';
import { customError } from '../../../../utils/customError';
import { db } from '../../../../utils/db.server';
import { Day, Prisma } from '@prisma/client';
import moment from 'moment-timezone';

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
            let startTime, endTime;
            try {
                // Assume timezone is provided in the slot data or from user's settings
                const timezone = 'Australia/Melbourne'; // Default to Melbourne if not specified
                startTime = adjustTimeToSpecifiedTimezone(slot.startTime, timezone);
                endTime = adjustTimeToSpecifiedTimezone(slot.endTime, timezone);

                if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                    throw new Error('Invalid date');
                }
            } catch (error) {
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
                const teacherId = room.teacherId || null;
                const classId = room.classId || null;

                let termSubjectLevelId: number | null = null;
                let sectionId: number | null = null;

                if (classId) {
                    const [tslId, secId] = classId.split('-').map(Number);
                    termSubjectLevelId = isNaN(tslId) ? null : tslId;
                    sectionId = isNaN(secId) ? null : secId;
                }

                const slotTeacherId = teacherId ? (isNaN(Number(teacherId)) ? null : Number(teacherId)) : null;
                await tx.timetableSlot.create({
                    data: {
                        timetableId: timetable.id,
                        classroomId: classrooms[i].id,
                        timeSlotId: timeSlot.id,
                        termSubjectLevelId,
                        sectionId,
                        teacherId: slotTeacherId
                    }
                });
                // Sync teacher allocation: upsert TeacherClassAssignment so teacher's assigned classes stay in sync
                if (slotTeacherId && termSubjectLevelId != null && sectionId != null) {
                    const timeRangeStr = `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`;
                    await tx.teacherClassAssignment.upsert({
                        where: {
                            teacherId_termSubjectLevelId_sectionId: {
                                teacherId: slotTeacherId,
                                termSubjectLevelId,
                                sectionId
                            }
                        },
                        create: {
                            teacherId: slotTeacherId,
                            termSubjectLevelId,
                            sectionId,
                            timeSlot: timeRangeStr
                        },
                        update: { timeSlot: timeRangeStr }
                    });
                }
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
    try {
        // Handle ISO string format
        if (time.includes('T')) {
            const date = new Date(time);
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        }

        // Handle HH:mm format
        const [hours, minutes] = time.split(':').map(Number);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;
        const formattedMinutes = minutes.toString().padStart(2, '0');
        return `${formattedHours}:${formattedMinutes} ${ampm}`;
    } catch (error) {
        throw new Error(`Invalid time format: ${time}`);
    }
}

function adjustTimeToSpecifiedTimezone(dateTimeString: string, timezone: string): Date {
    // Parse the date in the given timezone and then convert it to a JavaScript Date object
    return moment.tz(dateTimeString, timezone).toDate();
}

interface Room {
    teacherName?: string | null;
    className?: string | null;
    teacherId?: number | null;
    classId?: string | null;
    roomName?: string | null;
    roomId?: number | null;
    termSubjectLevelId?: number | null;
    sectionId?: number | null;
    timeRange?: string | null;
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
                const roomName = slot.classroom?.name || null;
                const roomId = slot.classroom?.id || null;
                const termSubjectLevelId = slot.termSubjectLevelId || null;
                const sectionId = slot.sectionId || null;
                const existingSlot = acc.find((s) => s.startTime === startTime.toISOString() && s.endTime === endTime.toISOString());

                const teacherName = slot.teacher?.teacherPersonalDetails?.firstName
                    ? `${slot.teacher?.teacherPersonalDetails?.firstName} ${slot.teacher?.teacherPersonalDetails?.lastName}`.trim()
                    : null;
                const teacherId = slot.teacher?.id || null;
                const className = slot.termSubjectLevel?.subject.name ? `${slot.termSubjectLevel?.subject.name} ${slot.termSubjectLevel?.level.name} ${slot.section?.name}`.trim() : null;

                if (existingSlot) {
                    existingSlot.rooms.push({
                        teacherName,
                        className,
                        roomName,
                        roomId,
                        termSubjectLevelId,
                        sectionId,
                        teacherId,
                        timeRange: `${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`
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
                                roomName,
                                roomId,
                                termSubjectLevelId,
                                sectionId,
                                teacherId,
                                timeRange: `${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`
                            }
                        ]
                    });
                }
                return acc;
            }, [])
        },
        roomNames: [...new Set(timetable.timetableSlots.map((slot) => slot.classroom?.name || ''))],
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

                const teacherName = slot.teacher?.teacherPersonalDetails?.firstName
                    ? `${slot.teacher?.teacherPersonalDetails?.firstName} ${slot.teacher?.teacherPersonalDetails?.lastName}`.trim()
                    : null;
                const className = slot.termSubjectLevel?.subject.name ? `${slot.termSubjectLevel?.subject.name} ${slot.termSubjectLevel?.level.name} ${slot.section?.name}`.trim() : null;

                const teacherId = slot.teacher?.id || null;
                const classId = `${slot.termSubjectLevelId}-${slot.sectionId}` || null;

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
        roomNames: [...new Set(timetable.timetableSlots.map((slot) => slot.classroom?.name || ''))],
        totalRooms: timetable.totalRooms,
        day: timetable.day
    };

    return transformedData;
}

export async function updateSchoolTimetable(timetableId: string, timetableData: UpdateSchoolTimetableSchema['body']['updateTimetableData']) {
    const { data, day, roomNames, totalRooms } = timetableData;
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

            // Process each time slot (use same timezone as create so PM/AM is preserved)
            const timezone = 'Australia/Melbourne';
            for (const slot of data.data) {
                let startTime: Date;
                let endTime: Date;
                try {
                    startTime = adjustTimeToSpecifiedTimezone(slot.startTime, timezone);
                    endTime = adjustTimeToSpecifiedTimezone(slot.endTime, timezone);
                    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                        throw new Error('Invalid date');
                    }
                } catch (error) {
                    throw new Error(`Invalid date format for start time (${slot.startTime}) or end time (${slot.endTime})`);
                }
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
                    const teacherId = room.teacherId || null;
                    const classId = room.classId || null;

                    let termSubjectLevelId: number | null = null;
                    let sectionId: number | null = null;

                    if (classId) {
                        const [tslId, secId] = classId.split('-').map(Number);
                        termSubjectLevelId = isNaN(tslId) ? null : tslId;
                        sectionId = isNaN(secId) ? null : secId;
                    }

                    const slotTeacherId = teacherId ? (isNaN(Number(teacherId)) ? null : Number(teacherId)) : null;
                    await tx.timetableSlot.create({
                        data: {
                            timetableId: timetable.id,
                            classroomId: classrooms[i].id,
                            timeSlotId: timeSlot.id,
                            termSubjectLevelId,
                            sectionId,
                            teacherId: slotTeacherId
                        }
                    });
                    // Sync teacher allocation: upsert TeacherClassAssignment so teacher's assigned classes stay in sync
                    if (slotTeacherId && termSubjectLevelId != null && sectionId != null) {
                        const timeRangeStr = `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`;
                        await tx.teacherClassAssignment.upsert({
                            where: {
                                teacherId_termSubjectLevelId_sectionId: {
                                    teacherId: slotTeacherId,
                                    termSubjectLevelId,
                                    sectionId
                                }
                            },
                            create: {
                                teacherId: slotTeacherId,
                                termSubjectLevelId,
                                sectionId,
                                timeSlot: timeRangeStr
                            },
                            update: { timeSlot: timeRangeStr }
                        });
                    }
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

export async function fetchAllTimetablesData() {
    const days: Day[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

    const allTimetables = await Promise.all(
        days.map(async (day) => {
            const timetable = await db.timetable.findFirst({
                where: { day, isActive: true },
                include: {
                    timetableSlots: {
                        include: {
                            classroom: true,
                            timeSlot: true,
                            teacher: {
                                include: {
                                    teacherPersonalDetails: true
                                }
                            },
                            termSubjectLevel: {
                                include: {
                                    subject: true,
                                    level: true
                                }
                            },
                            section: true
                        }
                    }
                }
            });

            return { [day]: timetable };
        })
    );

    return Object.assign({}, ...allTimetables);
}

export async function fetchStudentsInSameClassForTimetable(termSubjectLevelId: string, sectionId: string) {
    const classAssignments = await db.studentClassAssignment.findMany({
        where: {
            termSubjectLevelId: +termSubjectLevelId,
            sectionId: +sectionId,
            isCurrentlyAssigned: true,
            student: {
                isActive: true,
                role: 'STUDENT'
            }
        },
        select: {
            student: {
                select: {
                    akaalId: true,
                    personalDetails: {
                        select: {
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            }
        }
    });

    return classAssignments;
}

// ------------------- for school time table ------------------- //
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
