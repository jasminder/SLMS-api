import { z } from 'zod';

const healthDetailsSchema = z.object({
    id: z.string(),
    medicareNumber: z.string().optional(),
    ambulanceMembershipNumber: z.string().optional(),
    medicalCondition: z.string(),
    allergy: z.string(),
    contactPerson: z.string(),
    contactNumber: z.string(),
    relationship: z.string()
});
export type HealthDetailsSchema = z.infer<typeof healthDetailsSchema>;
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
export const ParentsSchema = z.object({
    id: z.string(),
    fatherName: z.string(),
    motherName: z.string(),
    parentEmail: z.string(),
    parentContact: z.string()
});

export const EmergencyContactSchema = z.object({
    id: z.string(),
    contactPerson: z.string(),
    contactNumber: z.string(),
    relationship: z.string()
});
//To update student PERSONAL details at the admin level
export const updateStudentPersonalDetailSchema = z.object({
    body: z.object(
        {
            data: PersonalSchema
        },
        { required_error: 'Some or all of Student data is missing which are required is required' }
    ),
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});

export type UpdateStudentPersonalDetailSchema = z.infer<typeof updateStudentPersonalDetailSchema>;

// Update student parents details schema at the admin level
export const updateStudentParentsDetailSchema = z.object({
    body: z.object(
        {
            data: ParentsSchema
        },
        { required_error: 'Some or all of Parents data is missing which are required is required' }
    ),
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type UpdateStudentParentsDetailSchema = z.infer<typeof updateStudentParentsDetailSchema>;

// Update Emergency and health Details
export const updateStudentHealthDetailSchema = z.object({
    body: z.object({
        healthInformation: healthDetailsSchema
    }),
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type UpdateStudentHealthDetailSchema = z.infer<typeof updateStudentHealthDetailSchema>;
export const updateStudentEmergencyDetailSchema = z.object({
    body: z.object({
        emergencyContact: EmergencyContactSchema
    }),
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type UpdateStudentEmergencyDetailSchema = z.infer<typeof updateStudentEmergencyDetailSchema>;
