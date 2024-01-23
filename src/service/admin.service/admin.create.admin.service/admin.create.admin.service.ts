import { AdminApplicantSchema } from '../../../schema/admin.dto/admin.create.admin.dto/admin.create.admin.dto';
import { customError } from '../../../utils/customError';
import { db } from '../../../utils/db.server';

export async function findAllSubjects() {
    const subjects = await db.subject.findMany({
        select: {
            name: true,
            isActive: true
        }
    });

    return subjects;
}
export async function createAdminApplicant(data: AdminApplicantSchema['body']) {
    const {
        adminEmergencyContact: { contactNumber, contactPerson, relationship },
        adminWWCHealthInformation: { medicalCondition, medicareNumber, childrenCheckCardNumber, workingWithChildrenCheckExpiry, workingwithChildrenCheckCardPhotoImage },
        adminOtherInformation: { otherInfo },
        adminPersonalDetails: { email, address, contact, country, firstName, gender, lastName, postcode, state, suburb, DOB, image },

        adminBankDetails: { BSB, accountNumber, bankAccountName, ABN },
        adminWorkRights: { immigrationStatus, workRights }
    } = data;
    const existingAdmin = await db.adminPersonalDetails.findUnique({
        where: {
            email,
            contact
        }
    });
    if (existingAdmin?.email || existingAdmin?.contact) {
        throw customError(`The Emaila nd contact number belongs to an existing account for admin. please contact the school. `, 'fail', 404, true);
    }

    try {
        const admin = await db.admin.create({
            data: {
                adminPersonalDetails: {
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
                adminEmergencyContact: {
                    create: {
                        contactPerson,
                        contactNumber,
                        relationship
                    }
                },
                adminWWCHealthInformation: {
                    create: {
                        medicareNumber: medicareNumber ? medicareNumber : 'No Medicare Number provided',
                        medicalCondition,
                        childrenCheckCardNumber,
                        workingWithChildrenCheckExpiry: new Date(workingWithChildrenCheckExpiry),
                        workingwithChildrenCheckCardPhotoImage
                    }
                },
                adminWorkRights: {
                    create: {
                        immigrationStatus,
                        workRights: workRights == 'yes' ? true : false
                    }
                },

                adminBankDetails: {
                    create: {
                        ABN,
                        accountNumber,
                        bankAccountName,
                        BSB
                    }
                },
                adminOtherInformation: {
                    create: {
                        otherInfo: otherInfo ? otherInfo : 'No information provided'
                    }
                }
            }
        });
        return admin;
    } catch (e) {
        // console.log(e);
        throw customError('Failed to create application', 'fail', 404, true); // Return an error message.
    }
}
