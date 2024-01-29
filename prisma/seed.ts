import { PrismaClient, Prisma } from '@prisma/client';
import { CreateNewTermSetupSchema } from '../src/schema/admin.dto/admin.administration.dto/admin.administration.dto';
import { TeacherApplicantSchema } from '../src/schema/teacher.applicant.dto/teacher.applicant.dto';
import { AdminApplicantSchema } from '../src/schema/admin.dto/admin.create.admin.dto/admin.create.admin.dto';

const prisma = new PrismaClient();

import { z } from 'zod';

export const PersonalSchema = z.object({
    id: z.number().optional(),
    firstName: z.string({ required_error: 'First name is required' }).min(3, { message: 'Name should be minimum 3 Characters' }),
    lastName: z.string({ required_error: 'Last name is required' }).min(3, { message: 'Last Name should be minimum 3 Characters' }),
    // DOB: z.date({ required_error: 'Please select a date ' }).min(new Date('2005-01-01'), { message: 'Age cannot be more than 18' }).max(new Date('2013-01-01'), { message: 'Age should be more 10' }).optional(),
    DOB: z.string(),
    gender: z.string({ required_error: 'Gender is required' }).min(1, { message: 'Enter gender' }),
    email: z.string({ required_error: 'Email is required' }).email({ message: 'Invalid email address' }),
    contact: z.string({ required_error: 'Mobile number is required' }).regex(/^0\d{9}$/, 'Please provide a valid Number!'),
    address: z.string({ required_error: 'Address is required' }).min(3, { message: 'minium 3 characters required' }),
    suburb: z.string({ required_error: 'suburn is required' }).min(3, { message: 'minium 3 characters required' }),
    state: z.string({ required_error: 'State is required' }),
    country: z.string({ required_error: 'State is required' }),
    postcode: z.string({ required_error: 'Post code is required' }).min(4, { message: 'Post code is minimum 4 digits' }).max(4, { message: 'Post code is maximum 4 digits' }),
    image: z.string({}).optional()
});

export const ParentsSchema = z.object({
    id: z.number().optional(),
    fatherName: z.string({ required_error: "Father's Name is required" }).min(3, { message: 'Minimum 3 characters' }),
    motherName: z.string({ required_error: "Mother's Name is required" }).min(3, { message: 'Minimum 3 characters' }),
    parentEmail: z.string({ required_error: "Parent's Email is required" }).email({ message: 'Invalid email address' }),
    parentContact: z.string({ required_error: "Parent'sMobile number is required" }).regex(/^0\d{9}$/, 'Please provide a valid Number!')
});

export const EmergencyContactSchema = z.object({
    id: z.number().optional(),
    contactPerson: z.string({ required_error: "Contact person's name is required" }).min(3, { message: 'Minimum 3 characters' }),
    contactNumber: z.string({ required_error: "Contact person's Mobile number is required" }).regex(/^0\d{9}$/, 'Please provide a valid Number!'),
    relationship: z.string({ required_error: 'Relationship with children is required' }).min(3, { message: 'Minimum 3 characters' })
});
// To create a new student at the application level
export const HealthInformationSchema = z.object({
    id: z.number().optional(),
    medicareNumber: z.string().optional(),
    ambulanceMembershipNumber: z.string().optional(),
    medicalCondition: z.string({ required_error: 'Please give a valid answer' }).min(3, { message: 'Mininum 3 characters' }),
    allergy: z.string({ required_error: 'valid' }).min(3, { message: 'Mininum 3 characters' })
});

export const SubjectInterest = z.object({
    id: z.number().optional(),
    subjectsChosen: z.array(z.string()).refine((subjects) => subjects.length > 0, {
        message: 'Please select at least one subject'
    }),
    subjectRelated: z.array(z.string()).refine((subjectRelated) => subjectRelated.length > 0, {
        message: 'Please select at least one option'
    })
});

export const OtherInformationSchema = z.object({
    id: z.number().optional(),
    otherInfo: z.string().optional(),
    declaration: z.array(z.string()).refine((subjectRelated) => subjectRelated.length > 0, {
        message: 'Please give your declaration'
    })
});

export const newApplicantSchema = z.object({
    body: z.object(
        {
            id: z.number(),
            personalDetails: PersonalSchema,
            parentsDetails: ParentsSchema,
            emergencyContact: EmergencyContactSchema,
            healthInformation: HealthInformationSchema,
            subjectInterest: SubjectInterest,
            otherInformation: OtherInformationSchema
        },
        { required_error: 'Some or all of Student data is missing which are required is required' }
    )
});

const studentData = require('../studentSeedData/updated_transformed_student_data.json');
export type NewApplicantSchema = z.infer<typeof newApplicantSchema>;
const studentSeedData: NewApplicantSchema['body'][] = studentData;


async function seedStudents() {
    console.log('Start seeding students...');

    for (const student of studentSeedData) {
        const {
            id,
            emergencyContact: { contactNumber, contactPerson, relationship },
            healthInformation: { allergy, medicalCondition, medicareNumber, ambulanceMembershipNumber },
            otherInformation: { declaration, otherInfo },
            parentsDetails: { fatherName, motherName, parentContact, parentEmail },
            personalDetails: { email, address, contact, country, firstName, gender, lastName, postcode, state, suburb, DOB, image },
            subjectInterest: { subjectRelated, subjectsChosen }
        } = student;
        console.log(id, 'student id');
        // console.log(student, "student fir seeding")
        const studentsCreated = await prisma.student.create({
            data: {
                id: id,
                personalDetails: {
                    create: {
                        firstName,
                        lastName,
                        DOB: new Date(DOB),
                        gender,
                        email,
                        contact,
                        address,
                        suburb,
                        state,
                        country,
                        postcode,
                        image
                    }
                },
                parentsDetails: {
                    create: {
                        fatherName,
                        motherName,
                        parentContact,
                        parentEmail
                    }
                },
                emergencyContact: {
                    create: {
                        contactPerson,
                        contactNumber,
                        relationship
                    }
                },
                healthInformation: {
                    create: {
                        medicareNumber: medicareNumber ? medicareNumber : 'No Medicare Number provided',
                        ambulanceMembershipNumber,
                        medicalCondition,
                        allergy
                    }
                },
                subjectsChosen,
                subjectRelated,
                otherInformation: {
                    create: {
                        otherInfo: otherInfo ? otherInfo : 'No information provided',
                        declaration
                    }
                }
            }
        });

    }
    console.log('Seeding finished.');
}

/*Teacher*/
// Define the teacher seed data
const teacherData = require('../teacherSeedData/transformed_teachers_data.json');
const teacherSeedData: TeacherApplicantSchema['body'][] = teacherData;


async function seedTeachers() {
    console.log('Start seeding teachers...');

    for (const teacher of teacherSeedData) {
        // Destructure your teacher data here
        const { teacherPersonalDetails, teacherEmergencyContact, teacherWWCHealthInformation, teacherWorkRights, teacherQualificationAvailability, teacherBankDetails, teacherOtherInformation } =
            teacher;

        try {
            const createdAdmin = await prisma.teacher.create({
                data: {
                    teacherPersonalDetails: {
                        create: teacherPersonalDetails
                    },
                    teacherEmergencyContact: {
                        create: teacherEmergencyContact
                    },
                    teacherWWCHealthInformation: {
                        create: teacherWWCHealthInformation
                    },
                    teacherWorkRights: {
                        create: {
                            immigrationStatus: teacherWorkRights.immigrationStatus,
                            workRights: true
                        }
                    },
                    teacherQualificationAvailability: {
                        create: teacherQualificationAvailability
                    },
                    teacherBankDetails: {
                        create: teacherBankDetails
                    },
                    teacherOtherInformation: {
                        create: teacherOtherInformation
                    }
                }
            });
            console.log(`Created teacher with id: ${createdAdmin.id}`);
        } catch (error) {
            console.error('Error creating teacher:', error);
        }
    }

    console.log('Seeding teachers finished.');
}
/*Admin*/

const adminSeedData: AdminApplicantSchema['body'][] = [
    {
        adminPersonalDetails: {
            firstName: 'Navinder',
            lastName: 'Singh',
            DOB: '1980-01-01T00:00:00.000Z',
            gender: 'Male',
            email: 'SNAVINDER007@YAHOO.COM',
            contact: '0421985131',
            address: '123 Main St 1',
            suburb: 'Suburb1',
            state: 'SomeState',
            country: 'SomeCountry',
            postcode: '1231',
            image: 'path/to/image.jpg'
        },
        adminEmergencyContact: {
            contactPerson: 'EmergencyContact1',
            contactNumber: '045678911',
            relationship: 'Relative'
        },
        adminWWCHealthInformation: {
            medicalCondition: 'None',
            medicareNumber: 'Medicare1',
            childrenCheckCardNumber: 'WWC1',
            workingWithChildrenCheckExpiry: '2030-01-01T00:00:00.000Z',
            workingwithChildrenCheckCardPhotoImage: 'path/to/photo.jpg'
        },
        adminWorkRights: {
            immigrationStatus: 'Visa Holder',
            workRights: 'yes'
        },
        adminBankDetails: {
            ABN: 'ABN1',
            accountNumber: 'Account1',
            bankAccountName: 'BankName1',
            BSB: 'BSB1'
        },
        adminOtherInformation: {
            otherInfo: 'Other Info 1'
        }
    },
    {
        adminPersonalDetails: {
            firstName: 'Lakhwinder',
            lastName: 'Singh',
            DOB: '1980-01-01T00:00:00.000Z',
            gender: 'male',
            email: 'singhaus1986@gmail.com',
            contact: '0433029912',
            address: '123 Main St 2',
            suburb: 'Suburb2',
            state: 'SomeState',
            country: 'SomeCountry',
            postcode: '1232',
            image: 'path/to/image.jpg'
        },
        adminEmergencyContact: {
            contactPerson: 'EmergencyContact2',
            contactNumber: '045678912',
            relationship: 'Relative'
        },
        adminWWCHealthInformation: {
            medicalCondition: 'None',
            medicareNumber: 'Medicare2',
            childrenCheckCardNumber: 'WWC2',
            workingWithChildrenCheckExpiry: '2030-01-01T00:00:00.000Z',
            workingwithChildrenCheckCardPhotoImage: 'path/to/photo.jpg'
        },
        adminWorkRights: {
            immigrationStatus: 'Citizen',
            workRights: 'yes'
        },
        adminBankDetails: {
            ABN: 'ABN2',
            accountNumber: 'Account2',
            bankAccountName: 'BankName2',
            BSB: 'BSB2'
        },
        adminOtherInformation: {
            otherInfo: 'Other Info 2'
        }
    },
    {
        adminPersonalDetails: {
            firstName: 'Akaal',
            lastName: 'Shaouni',
            DOB: '1980-01-01T00:00:00.000Z',
            gender: 'male',
            email: 'akaalshaouni@gmail.com',
            contact: '0433029910',
            address: '123 Main St 2',
            suburb: 'Suburb2',
            state: 'SomeState',
            country: 'SomeCountry',
            postcode: '1232',
            image: 'path/to/image.jpg'
        },
        adminEmergencyContact: {
            contactPerson: 'EmergencyContact2',
            contactNumber: '045678912',
            relationship: 'Relative'
        },
        adminWWCHealthInformation: {
            medicalCondition: 'None',
            medicareNumber: 'Medicare2',
            childrenCheckCardNumber: 'WWwwC2',
            workingWithChildrenCheckExpiry: '2030-01-01T00:00:00.000Z',
            workingwithChildrenCheckCardPhotoImage: 'path/to/photo.jpg'
        },
        adminWorkRights: {
            immigrationStatus: 'Citizen',
            workRights: 'yes'
        },
        adminBankDetails: {
            ABN: 'ABN2',
            accountNumber: 'Account2',
            bankAccountName: 'BankName2',
            BSB: 'BSB2'
        },
        adminOtherInformation: {
            otherInfo: 'Other Info 2'
        }
    }
];



async function seedAdmins() {
    console.log('Start seeding Admin...');
    for (const admin of adminSeedData) {
        // Destructure your admin data here
        const { adminPersonalDetails, adminEmergencyContact, adminWWCHealthInformation, adminWorkRights, adminBankDetails, adminOtherInformation } = admin;

        try {
            const createdAdmin = await prisma.admin.create({
                data: {
                    adminPersonalDetails: {
                        create: adminPersonalDetails
                    },
                    adminEmergencyContact: {
                        create: adminEmergencyContact
                    },
                    adminWWCHealthInformation: {
                        create: adminWWCHealthInformation
                    },
                    adminWorkRights: {
                        create: {
                            immigrationStatus: adminWorkRights.immigrationStatus,
                            workRights: true
                        }
                    },
                    adminBankDetails: {
                        create: adminBankDetails
                    },
                    adminOtherInformation: {
                        create: adminOtherInformation
                    }
                }
            });
            console.log(`Created admin with id: ${createdAdmin.id}`);
        } catch (error) {
            console.error('Error creating admin:', error);
        }
    }

    console.log('Seeding admins finished.');
}

async function resetStudents() {
    await prisma.subjectEnrollment.deleteMany({});
    await prisma.studentTermFee.deleteMany({});
    await prisma.student.deleteMany({});
    console.log('All student records deleted.');
}

async function main() {
    if (process.env.NODE_ENV == 'development') {
        await resetStudents();
        await seedStudents();
        // await seedTeachers();
        // await seedAdmins();

        console.log('seed in development');
    } else {
        console.log('cannot seed in production');
    }
}

main()
    .catch(async (error) => {
        console.error('Error during seeding:', error);
        await prisma.$disconnect();
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

//
