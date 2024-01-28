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
// for (let i = 1; i <= 45; i++) {
//     studentSeedData.push({
//         personalDetails: {
//             firstName: `Name${i}`,
//             lastName: `Lopez${i}`,
//             DOB: new Date('01/01/2010').toISOString(),
//             gender: i % 2 === 0 ? 'male' : 'female',
//             email: `emil${i}@domain.com`,
//             contact: `03990345${63 + i}`,
//             address: `789 Elm Avenue, Apt ${i}`,
//             suburb: `Suburb${i}`,
//             state: 'California',
//             country: 'USA',
//             postcode: `124${i}`,
//             image: ''
//         },
//         parentsDetails: {
//             fatherName: `Father${i}`,
//             motherName: `Mother${i}`,
//             parentEmail: `parent${i}@example.com`,
//             parentContact: `01234${560 + i}`
//         },
//         emergencyContact: {
//             contactPerson: `Contact${i}`,
//             contactNumber: `00112233${50 + i}`,
//             relationship: 'cousin'
//         },
//         healthInformation: {
//             medicareNumber: `3680${320 + i}23`,
//             ambulanceMembershipNumber: `${1111 + i}`,
//             medicalCondition: 'None',
//             allergy: 'None'
//         },
//         subjectInterest: {
//             subjectsChosen: ['Math', 'English'],
//             subjectRelated: ['option-1', 'option-2']
//         },
//         otherInformation: {
//             otherInfo: `Info ${i}`,
//             declaration: ["I pledge to follow the school's rules."]
//         }
//     });
// }

async function seedStudents() {
    console.log('Start seeding students...');

    for (const student of studentSeedData) {
        const {
            emergencyContact: { contactNumber, contactPerson, relationship },
            healthInformation: { allergy, medicalCondition, medicareNumber, ambulanceMembershipNumber },
            otherInformation: { declaration, otherInfo },
            parentsDetails: { fatherName, motherName, parentContact, parentEmail },
            personalDetails: { email, address, contact, country, firstName, gender, lastName, postcode, state, suburb, DOB, image },
            subjectInterest: { subjectRelated, subjectsChosen }
        } = student;
        const studentsCreated = await prisma.student.create({
            data: {
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
        //   console.log(`Created student with id: ${student.id}`);
    }
    console.log('Seeding finished.');
}

/*Teacher*/
// Define the teacher seed data
const teacherData = require('../teacherSeedData/transformed_teachers_data.json');
const teacherSeedData: TeacherApplicantSchema['body'][] = teacherData;
// for (let i = 1; i <= 15; i++) {
//     teacherSeedData.push({
//         teacherPersonalDetails: {
//             firstName: `TeacherFirst${i}`,
//             lastName: `Last${i}`,
//             DOB: new Date('1980-01-01').toISOString(),
//             gender: i % 2 === 0 ? 'male' : 'female',
//             email: `teacher${i}@domain.com`,
//             contact: `0456789${i}`,
//             address: `123 Main St ${i}`,
//             suburb: `Suburb${i}`,
//             state: 'SomeState',
//             country: 'SomeCountry',
//             postcode: `123${i}`,
//             image: 'path/to/image.jpg'
//         },
//         teacherEmergencyContact: {
//             contactPerson: `EmergencyContact${i}`,
//             contactNumber: `0456789${i + 10}`,
//             relationship: 'Relative'
//         },
//         teacherWWCHealthInformation: {
//             medicalCondition: 'None',
//             medicareNumber: `Medicare${i}`,
//             childrenCheckCardNumber: `WWC${i}`,
//             workingWithChildrenCheckExpiry: new Date('2030-01-01').toISOString(),
//             workingwithChildrenCheckCardPhotoImage: 'path/to/photo.jpg'
//         },
//         teacherWorkRights: {
//             immigrationStatus: i % 2 === 0 ? 'Citizen' : 'Visa Holder',
//             workRights: 'yes'
//         },
//         teacherQualificationAvailability: {
//             experience: `${i} years`,
//             qualification: `Qualification${i}`,
//             subjectsChosen: ['Math', 'Science'],
//             timeSlotsChosen: ['Monday Morning', 'Wednesday Afternoon']
//         },
//         teacherBankDetails: {
//             ABN: `ABN${i}`,
//             accountNumber: `Account${i}`,
//             bankAccountName: `BankName${i}`,
//             BSB: `BSB${i}`
//         },
//         teacherOtherInformation: {
//             otherInfo: `Other Info ${i}`
//         }
//     });
// }

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

// for (let i = 1; i <= 2; i++) {
//     adminSeedData.push({
//         adminPersonalDetails: {
//             firstName: `TeacherFirst${i}`,
//             lastName: `Last${i}`,
//             DOB: new Date('1980-01-01').toISOString(),
//             gender: i % 2 === 0 ? 'male' : 'female',
//             email: `teacher${i}@domain.com`,
//             contact: `0456789${i}`,
//             address: `123 Main St ${i}`,
//             suburb: `Suburb${i}`,
//             state: 'SomeState',
//             country: 'SomeCountry',
//             postcode: `123${i}`,
//             image: 'path/to/image.jpg'
//         },
//         adminEmergencyContact: {
//             contactPerson: `EmergencyContact${i}`,
//             contactNumber: `0456789${i + 10}`,
//             relationship: 'Relative'
//         },
//         adminWWCHealthInformation: {
//             medicalCondition: 'None',
//             medicareNumber: `Medicare${i}`,
//             childrenCheckCardNumber: `WWC${i}`,
//             workingWithChildrenCheckExpiry: new Date('2030-01-01').toISOString(),
//             workingwithChildrenCheckCardPhotoImage: 'path/to/photo.jpg'
//         },
//         adminWorkRights: {
//             immigrationStatus: i % 2 === 0 ? 'Citizen' : 'Visa Holder',
//             workRights: 'yes'
//         },
//         adminBankDetails: {
//             ABN: `ABN${i}`,
//             accountNumber: `Account${i}`,
//             bankAccountName: `BankName${i}`,
//             BSB: `BSB${i}`
//         },
//         adminOtherInformation: {
//             otherInfo: `Other Info ${i}`
//         }
//     });
// }

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

/* Create terms*/

// async function seedTerms() {
//     const termData: CreateNewTermSetupSchema['body'] = {
//         termName: 'Term Summer 2024',
//         startDate: new Date('2023-12-04T00:00:00Z').toISOString(),
//         endDate: new Date('2024-12-12T23:59:59Z').toISOString(),
//         groupSubjects: [
//             {
//                 groupName: 'Group Music',
//                 fee: '200',
//                 feeInterval: 'MONTHLY',
//                 subjects: [
//                     {
//                         subjectName: 'music',
//                         levels: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8']
//                     }
//                 ]
//             },
//             {
//                 groupName: 'Group Other',
//                 fee: '300',
//                 feeInterval: 'TERM',
//                 subjects: [
//                     {
//                         subjectName: 'maths',
//                         levels: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8']
//                     },
//                     {
//                         subjectName: 'english',
//                         levels: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8']
//                     }
//                 ]
//             }
//         ]
//     };
//     const { termName, startDate, endDate, groupSubjects } = termData;

//     const existingTerm = await prisma.term.findFirst({
//         where: { name: termName.toLowerCase() }
//     });

//     if (!existingTerm) {
//         const createdTerm = await prisma.term.create({
//             data: {
//                 name: termName.toLowerCase(),
//                 startDate,
//                 endDate
//             }
//         });

//         for (const group of groupSubjects) {
//             let subjectGroup = await prisma.subjectGroup.findUnique({
//                 where: { groupName: group.groupName.toLowerCase() }
//             });

//             if (!subjectGroup) {
//                 subjectGroup = await prisma.subjectGroup.create({
//                     data: { groupName: group.groupName.toLowerCase() }
//                 });
//             }

//             let fee = await prisma.fee.findFirst({
//                 where: {
//                     amount: parseInt(group.fee),
//                     paymentType: group.feeInterval === 'MONTHLY' ? 'MONTHLY' : 'TERM'
//                 }
//             });

//             if (!fee) {
//                 fee = await prisma.fee.create({
//                     data: {
//                         amount: parseInt(group.fee),
//                         paymentType: group.feeInterval === 'MONTHLY' ? 'MONTHLY' : 'TERM'
//                     }
//                 });
//             }

//             const termSubjectGroup = await prisma.termSubjectGroup.create({
//                 data: {
//                     termId: createdTerm.id,
//                     subjectGroupId: subjectGroup.id,
//                     feeId: fee.id
//                 }
//             });

//             for (const subjectData of group.subjects) {
//                 let subject = await prisma.subject.findUnique({
//                     where: { name: subjectData.subjectName.toLowerCase() }
//                 });

//                 if (!subject) {
//                     subject = await prisma.subject.create({
//                         data: { name: subjectData.subjectName.toLowerCase() }
//                     });
//                 }

//                 const levelConnections = subjectData.levels.map(levelName => ({
//                     where: { name: levelName },
//                     create: { name: levelName }
//                 }));

//                 await prisma.termSubject.create({
//                     data: {
//                         termSubjectGroupId: termSubjectGroup.id,
//                         subjectId: subject.id,
//                         level: {
//                             connectOrCreate: levelConnections
//                         },
//                         termId: createdTerm.id
//                     }
//                 });
//             }
//         }

//         console.log(`Created term with id: ${createdTerm.id}`);
//     } else {
//         console.log(`Term with name '${termName}' already exists.`);
//     }

//     console.log('Finished seeding terms.');
// }

//

async function main() {
    if (process.env.NODE_ENV == 'development') {
        await seedStudents();
        await seedTeachers();
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
