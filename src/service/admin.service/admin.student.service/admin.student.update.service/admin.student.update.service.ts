import { z } from 'zod';
import bcrypt from 'bcrypt';
import { db } from '../../../../utils/db.server';
import { customError } from '../../../../utils/customError';
import {
    UpdateStudentEmergencyDetailSchema,
    UpdateStudentHealthDetailSchema,
    UpdateStudentParentsDetailSchema,
    UpdateStudentPersonalDetailSchema
} from '../../../../schema/admin.dto/admin.student.dto/admin.student.update.dto/admin.student.update.dto';

// update student personal details service
export async function updateStudentPersonalDetail(id: string, data: UpdateStudentPersonalDetailSchema['body']['data']) {
    const { firstName, lastName, punjabiName, DOB, gender, email, contact, address, suburb, state, country, postcode, image } = data;
    const existingStudent = await db.student.findUnique({
        where: {
            id: +id
        },
        include: {
            personalDetails: true,
            parentsDetails: true
        }
    });
    // if (existingStudent?.personalDetails?.contact == existingStudent?.parentsDetails?.parentContact) {
    //     throw customError(`Primary and secondary contact number must differ`, 'fail', 400, true);
    // }

    /***********************************************************/
    /***********************************************************/
    try {
        const updateStudent = await db.student.update({
            where: {
                id: +id
            },
            data: {
                personalDetails: {
                    update: {
                        firstName,
                        lastName,
                        punjabiName,
                        DOB,
                        gender,
                        email: email.toLowerCase(),
                        contact,
                        address,
                        suburb,
                        state,
                        country,
                        postcode,
                        image
                    }
                }
            }
        });
        return updateStudent;
    } catch (e) {
        throw customError(`Failed to update student personal details @ksm${e}`, 'fail', 400, true);
    }
}

// update student parents details service
export async function updateStudentParentsDetail(id: string, data: UpdateStudentParentsDetailSchema['body']['data']) {
    const { parentContact, parentEmail, fatherName, motherName } = data;
    try {
        const updateStudent = await db.student.update({
            where: {
                id: +id
            },
            data: {
                parentsDetails: {
                    update: {
                        parentContact,
                        parentEmail,
                        fatherName,
                        motherName
                    }
                }
            }
        });
        if (!updateStudent) throw customError('student does not exist with given ID', 'fail', 400, true);
        return updateStudent;
    } catch (e) {
        throw customError(`Failed to update student parents details @ksm${e}`, 'fail', 400, true);
    }
}

// Update Emergency and health Details
export async function updateStudentHealthInformation(id: string, data: UpdateStudentHealthDetailSchema['body']) {
    const { allergy, medicalCondition, medicareNumber, ambulanceMembershipNumber } = data.healthInformation;
    const existingStudent = await db.healthInformation.findFirst({
        where: {
            OR: [{ medicareNumber }]
        }
    });

    if (existingStudent?.id != +id) {
        throw customError(`Medicare already exists already exists`, 'fail', 400, true);
    }
    try {
        const updateStudent = await db.student.update({
            where: {
                id: +id
            },
            data: {
                healthInformation: {
                    update: { allergy, medicalCondition, medicareNumber, ambulanceMembershipNumber }
                }
            }
        });
        if (!updateStudent) throw customError('student does not exist with given ID', 'fail', 400, true);
        return updateStudent;
    } catch (e) {
        throw customError(`Failed to update student health and emergency details @ksm${e}`, 'fail', 400, true);
    }
}
// Update student password (admin direct change)
export async function updateStudentPassword(id: string, newPassword: string, confirmPassword: string) {
    if (newPassword !== confirmPassword) {
        throw customError('Passwords do not match', 'fail', 400, true);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const user = await db.user.findFirst({
        where: { studentId: +id }
    });

    if (!user) {
        // Student has no User account yet (never self-registered).
        // Create one now using the email from personalDetails so the admin
        // can always manage student credentials regardless of signup status.
        const student = await db.student.findUnique({
            where: { id: +id },
            include: { personalDetails: true }
        });

        if (!student || !student.personalDetails?.email) {
            throw customError('Student not found or has no email on file', 'fail', 404, true);
        }

        await db.user.create({
            data: {
                email: student.personalDetails.email.toLowerCase(),
                password: hashedPassword,
                role: student.role,
                studentId: +id,
                isEmailVerified: true
            }
        });
        return;
    }

    await db.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
    });
}

// Update Emergency Details
export async function updateStudentEmergencyContact(id: string, data: UpdateStudentEmergencyDetailSchema['body']) {
    const { contactNumber, contactPerson, relationship } = data.emergencyContact;

    // First, check if the student exists
    const existingStudent = await db.student.findUnique({
        where: {
            id: +id
        },
        include: {
            emergencyContact: true
        }
    });

    // If the student does not exist, throw an error
    if (!existingStudent) {
        throw customError(`Student does not exist with given ID`, 'fail', 400, true);
    }

    try {
        // Update the emergency contact details of the student
        const updatedStudent = await db.student.update({
            where: {
                id: +id
            },
            data: {
                emergencyContact: {
                    update: {
                        contactNumber,
                        contactPerson,
                        relationship
                    }
                }
            }
        });

        // Return the updated student data
        return updatedStudent;
    } catch (e) {
        // Handle any errors that occur during the update
        throw customError(`Failed to update student emergency details @ksm${e}`, 'fail', 400, true);
    }
}
