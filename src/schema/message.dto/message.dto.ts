import { z } from 'zod';

export const createMessageSchema = z.object({
    body: z.object({
        content: z.string(),
        receiverId: z.string().min(1, { message: 'Receiver ID must be valid' }),
        senderId: z.string().min(1, { message: 'Receiver ID must be valid' }),
        userType: z.string()
    })
});
export type CreateMessageSchema = z.infer<typeof createMessageSchema>;

export const updateMessageStatusSchema = z.object({
    body: z.object({
        status: z.string(),
        messageIds: z.array(z.string())
    })
});

export type UpdateMessageStatusSchema = z.infer<typeof updateMessageStatusSchema>;

export const fetchMessageSchema = z.object({
    params: z.object({
        studentId: z.string()
    })
});
export type FetchMessageSchema = z.infer<typeof fetchMessageSchema>;
export const fetchAdminMessageSchema = z.object({
    params: z.object({
        adminId: z.string()
    })
});
export type FetchAdminMessageSchema = z.infer<typeof fetchAdminMessageSchema>;
