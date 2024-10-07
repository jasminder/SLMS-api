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

// ------------------- for school time table ------------------- //
export const createSchoolTimetableSchema = z.object({
    body: z.object({
        createSchoolTimetableData: z.object({
            data: z.object({
                data: z.array(
                    z.object({
                        startTime: z.string().regex(/^\d{2}:\d{2}$/),
                        endTime: z.string().regex(/^\d{2}:\d{2}$/),
                        rooms: z.array(
                            z.object({
                                teacherId: z.string(),
                                classId: z.string()
                            })
                        )
                    })
                )
            }),
            roomNames: z.array(z.string()),
            totalRooms: z.number().int().positive(),
            day: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])
        })
    })
});

export type CreateSchoolTimetableSchema = z.infer<typeof createSchoolTimetableSchema>;

export const DayEnum = z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']);

export const fetchTimetableSchema = z.object({
    params: z.object({
        day: DayEnum
    })
});

export type FetchTimetableSchema = z.infer<typeof fetchTimetableSchema>;

// ------------------- for school time table ------------------- //
