import { z } from 'zod';

export const AdminPersonalDetailsSchema = z.object({
    firstName: z.string({ required_error: 'First name is required' }).min(3, { message: 'Name should be minimum 3 Characters' }),
    lastName: z.string({ required_error: 'Last name is required' }).min(3, { message: 'Last Name should be minimum 3 Characters' }),
    DOB: z.string(),
    gender: z.string({ required_error: 'Gender is required' }).min(1, { message: 'Enter gender' }),
    email: z.string({ required_error: 'Email is required' }).email({ message: 'Invalid email address' }),
    contact: z.string({ required_error: 'Mobile number is required' }).regex(/^0\d{9}$/, 'Please provide a valid Number!'),
    address: z.string({ required_error: 'Address is required' }).min(3, { message: 'minium 3 characters required' }),
    suburb: z.string({ required_error: 'suburn is required' }).min(3, { message: 'minium 3 characters required' }),
    state: z.string({ required_error: 'State is required' }),
    country: z.string({ required_error: 'State is required' }),
    postcode: z.string({ required_error: 'Post code is required' }).min(4, { message: 'Post code is minimum 4 digits' }).max(4, { message: 'Post code is maximum 4 digits' }),
    image: z
        .any()
        .refine((file) => !file || file.size <= 20971520, {
            message: 'Max image size is 20MB.'
        })
        .refine((file) => !file || ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type), {
            message: 'Only .jpg, .jpeg and .png formats are supported.'
        })
});

export const AdminEmergencyContactSchema = z.object({
    contactPerson: z.string({ required_error: "Contact person's name is required" }).min(3, { message: 'Minimum 3 characters' }),
    contactNumber: z.string({ required_error: "Contact person's Mobile number is required" }).regex(/^0\d{9}$/, 'Please provide a valid Number!'),
    relationship: z.string({ required_error: 'Relationship with children is required' }).min(3, { message: 'Minimum 3 characters' })
});
export const AdminWWCHealthInformationSchema = z.object({
    medicareNumber: z.string().optional(),
    medicalCondition: z.string({ required_error: 'Please give a valid answer' }).min(3, { message: 'Mininum 3 characters' }),
    childrenCheckCardNumber: z.string().min(3, { message: 'Please enter valid value' }),
    workingWithChildrenCheckExpiry: z.string(),
    workingwithChildrenCheckCardPhotoImage: z
        .any()
        .refine((file) => !file || file.size <= 20971520, {
            message: 'Max image size is 20MB.'
        })
        .refine((file) => !file || ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type), {
            message: 'Only .jpg, .jpeg and .png formats are supported.'
        })
});
export const AdminWorkRightsSchema = z.object({
    workRights: z.string().min(3, { message: 'must choose and option' }),
    immigrationStatus: z.string().min(3, { message: 'must choose and option' })
});

export const AdminOtherInformationSchema = z.object({
    otherInfo: z.string().optional()
});

export const AdminBankDetailsSchema = z.object({
    bankAccountName: z.string(),
    BSB: z.string(),
    accountNumber: z.string(),
    ABN: z.string().optional()
});

export const adminApplicantSchema = z.object({
    body: z.object({
        adminPersonalDetails: AdminPersonalDetailsSchema,
        adminEmergencyContact: AdminEmergencyContactSchema,
        adminWWCHealthInformation: AdminWWCHealthInformationSchema,
        adminWorkRights: AdminWorkRightsSchema,
        adminBankDetails: AdminBankDetailsSchema,
        adminOtherInformation: AdminOtherInformationSchema
    })
});

export type AdminApplicantSchema = z.infer<typeof adminApplicantSchema>;
