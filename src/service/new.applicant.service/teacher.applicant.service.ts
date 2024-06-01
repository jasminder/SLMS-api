import { TeacherApplicantSchema } from '../../schema/teacher.applicant.dto/teacher.applicant.dto';
import { customError } from '../../utils/customError';
import { db } from '../../utils/db.server';

export async function findAllSubjects() {
    const subjects = await db.subject.findMany({
        select: {
            name: true,
            isActive: true
        }
    });

    return subjects;
}
export async function createTeacherApplicant(data: TeacherApplicantSchema['body']) {
    const {
        teacherEmergencyContact: { contactNumber, contactPerson, relationship },
        teacherWWCHealthInformation: { medicalCondition, medicareNumber, childrenCheckCardNumber, workingWithChildrenCheckExpiry, workingwithChildrenCheckCardPhotoImage },
        teacherOtherInformation: { otherInfo },
        teacherPersonalDetails: { email, address, contact, country, firstName, gender, lastName, postcode, state, suburb, DOB, image },
        teacherQualificationAvailability: { subjectsChosen, experience, qualification, timeSlotsChosen },
        teacherBankDetails: { BSB, accountNumber, bankAccountName, ABN },
        teacherWorkRights: { immigrationStatus, workRights }
    } = data;
    const existingTeacher = await db.teacherPersonalDetails.findUnique({
        where: {
            email,
            contact
        }
    });
    if (existingTeacher?.email || existingTeacher?.contact) {
        throw customError(`The Email and contact number belongs to an existing account for teacher. please contact the school. `, 'fail', 404, true);
    }

    try {
        const teacher = await db.teacher.create({
            data: {
                teacherPersonalDetails: {
                    create: {
                        firstName,
                        lastName,
                        DOB: new Date(DOB),
                        gender,
                        email:email.toLowerCase(),
                        contact,
                        address,
                        suburb,
                        state,
                        country,
                        postcode,
                        image
                    }
                },
                teacherEmergencyContact: {
                    create: {
                        contactPerson,
                        contactNumber,
                        relationship
                    }
                },
                teacherWWCHealthInformation: {
                    create: {
                        medicareNumber: medicareNumber ? medicareNumber : 'No Medicare Number provided',
                        medicalCondition,
                        childrenCheckCardNumber,
                        workingWithChildrenCheckExpiry: new Date(workingWithChildrenCheckExpiry),
                        workingwithChildrenCheckCardPhotoImage
                    }
                },
                teacherWorkRights: {
                    create: {
                        immigrationStatus,
                        workRights: workRights == 'yes' ? true : false
                    }
                },
                teacherQualificationAvailability: {
                    create: {
                        experience,
                        qualification,
                        subjectsChosen,
                        timeSlotsChosen
                    }
                },
                teacherBankDetails: {
                    create: {
                        ABN,
                        accountNumber,
                        bankAccountName,
                        BSB
                    }
                },
                teacherOtherInformation: {
                    create: {
                        otherInfo: otherInfo ? otherInfo : 'No information provided'
                    }
                }
            }
        });
        return teacher;
    } catch (e) {
        // console.log(e);
        throw customError('Failed to create application with ', 'fail', 404, true); // Return an error message.
    }
}
