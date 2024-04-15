import { z } from 'zod';

export const createNewEventSchema = z.object({
    body: z.object({
        start: z.string(),
        end: z.string(),
        data: z.object({
            appointment: z.object({
                title: z.string().min(3, { message: 'Title is required' }),
                color: z.string().optional(),
                isCompleted: z.boolean().optional(),
                location: z.string().optional(),
                status: z.string().optional(),
                address: z.string().optional(),
                remarks: z.string().optional(),
                type: z.string().optional()
            })
        })
    })
});

export type CreateNewEventSchema = z.infer<typeof createNewEventSchema>;
