import { customError } from '../../utils/customError';
import { db } from '../../utils/db.server';

/*find teacher by ID*/
export async function findTeacherByIdForTeacher(id: string) {
    const teacher = await db.teacher.findUnique({
        where: {
            id: +id,
            role: 'TEACHER',
            isActive: true
        },
        select: {
            id: true,
            role: true,
            createdAt: true,
            teacherPersonalDetails: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    DOB: true,
                    gender: true,
                    email: true,
                    contact: true,
                    address: true,
                    suburb: true,
                    state: true,
                    country: true,
                    postcode: true,
                    image: true
                }
            },

            teacherEmergencyContact: {
                select: {
                    id: true,
                    contactPerson: true,
                    contactNumber: true,
                    relationship: true
                }
            },
            teacherWWCHealthInformation: {
                select: {
                    id: true,
                    medicareNumber: true,
                    medicalCondition: true,
                    childrenCheckCardNumber: true,
                    workingwithChildrenCheckCardPhotoImage: true,
                    workingWithChildrenCheckExpiry: true
                }
            },
            teacherWorkRights: {
                select: {
                    immigrationStatus: true,
                    workRights: true
                }
            },
            teacherQualificationAvailability: {
                select: {
                    experience: true,
                    qualification: true,
                    subjectsChosen: true,
                    timeSlotsChosen: true
                }
            },
            teacherBankDetails: {
                select: {
                    ABN: true,
                    accountNumber: true,
                    bankAccountName: true,
                    BSB: true
                }
            },
            teacherOtherInformation: {
                select: {
                    id: true,
                    otherInfo: true
                }
            }
        }
    });

    return teacher;
}
