import { z } from 'zod';

const roomSchema = z.object({
    teacherName: z.string().optional(),
    subjectName: z.string().optional()
});

const timeSlotSchema = z.object({
    name: z.string(),
    rooms: z.array(roomSchema)
});

export const timeTableSchema = z.object({
    body: z.object({
        createTimetableData: z.object({
            totalRooms: z.number(),
            data: z.object({
                data: z.array(timeSlotSchema)
            }),
            roomNames: z.array(z.string())
        })
    })
});

export type TimeTableSchema = z.infer<typeof timeTableSchema>;

export const updateTimeTableSchema = z.object({
    body: z.object({
        totalRooms: z.number(),
        data: z.object({
            data: z.array(timeSlotSchema)
        }),
        roomNames: z.array(z.string())
    }),
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type UpdateTimeTableSchema = z.infer<typeof updateTimeTableSchema>;

export const findUniqueTimetableSchema = z.object({
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FindUniqueTimetableSchema = z.infer<typeof findUniqueTimetableSchema>;

// ------------------- for time table ------------------- //
export const timetableSchema = z.object({
    body: z.object({
        name: z.string(),
        isActive: z.boolean(),
        timetableSlots: z.array(
            z.object({
                classroomId: z.number(),
                timeSlotId: z.number(),
                termSubjectLevelId: z.number(),
                sectionId: z.number(),
                teacherId: z.number()
            })
        )
    })
});
// ------------------- for time table ------------------- //
