import { z } from 'zod';

export const PersonalSchema = z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    DOB: z.string(),
    gender: z.string(),
    email: z.string().email(),
    contact: z.string(),
    address: z.string(),
    suburb: z.string(),
    state: z.string(),
    country: z.string(),
    postcode: z.string(),
    image: z.string().optional()
});
export const updateTeacherPersonalDetailSchema = z.object({
    body: z.object(
        {
            data: PersonalSchema
        },
        { required_error: 'Some or all of Teacher data is missing which are required is required' }
    ),
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type UpdateTeacherPersonalDetailSchema = z.infer<typeof updateTeacherPersonalDetailSchema>;
export const findUniqueTeacherSchema = z.object({
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type FindUniqueTeacherSchema = z.infer<typeof findUniqueTeacherSchema>;
