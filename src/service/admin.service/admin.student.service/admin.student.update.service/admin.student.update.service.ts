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
import { AccountActionError } from '../../../account.status.service/account.action.error';
import { findEligibleLoginRoles } from '../../../account.status.service/login.eligibility.service';
import { decideSignupRole } from '../../../auth.service/signup.role.rules';
import { normalizeEmail } from '../../../teacher.duplicate.service/teacher.duplicate.rules';

// update student personal details service
export async function updateStudentPersonalDetail(id: string, data: UpdateStudentPersonalDetailSchema['body']['data']) {
    const { firstName, lastName, punjabiName, DOB, gender, email, contact, address, suburb, state, country, postcode, image } = data;

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
//
// Safety rules (this used to create a login with `role: student.role`, which could be ALUMNI/APPLICANT, and turned any
// email clash into a generic 500):
//  - If a login is LINKED to this student (User.studentId) its password is changed, but only when that login is a
//    STUDENT login. A wrong-role linked login is reported, not changed.
//  - A shared email never lets this action change another person's login: a login that merely uses the same email
//    (for example a sibling's family login, or a teacher's login) is NOT touched.
//  - A login is created ONLY when ALL of these hold: the student is an active STUDENT who is allowed to log in, has
//    an email, no login at all uses that email, and that email is eligible for exactly one profile type (this
//    student's). The new login always gets the role STUDENT and is linked to this student.
//  - Every refusal is a clear AccountActionError; nothing is changed or created in those cases.
export async function updateStudentPassword(id: string, newPassword: string, confirmPassword: string) {
    if (newPassword !== confirmPassword) {
        throw customError('Passwords do not match', 'fail', 400, true);
    }
    const studentId = +id;
    if (!Number.isInteger(studentId)) {
        throw new AccountActionError(404, 'STUDENT_NOT_FOUND', 'Student not found.');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    try {
        await db.$transaction(async (tx) => {
            const student = await tx.student.findUnique({
                where: { id: studentId },
                select: { id: true, role: true, isActive: true, isAllowedLogin: true, personalDetails: { select: { email: true } } }
            });
            if (!student) {
                throw new AccountActionError(404, 'STUDENT_NOT_FOUND', 'Student not found.');
            }

            const linkedLogin = await tx.user.findFirst({ where: { studentId } });
            if (linkedLogin) {
                if (linkedLogin.role !== 'STUDENT') {
                    throw new AccountActionError(409, 'ACCOUNT_CONFLICT', 'The login linked to this student is not a STUDENT login. Nothing was changed.');
                }
                await tx.user.update({ where: { id: linkedLogin.id }, data: { password: hashedPassword } });
                return;
            }

            // No linked login: creation is allowed only under strict conditions.
            const email = normalizeEmail(student.personalDetails?.email);
            if (!email) {
                throw new AccountActionError(400, 'NO_EMAIL', 'This student has no email on file, so no login can be created.');
            }
            if (student.role !== 'STUDENT' || !student.isActive || !student.isAllowedLogin) {
                throw new AccountActionError(409, 'NOT_ELIGIBLE', 'This student is not eligible for a login (must be an active student with login enabled). No account was created.');
            }
            const loginOnEmail = await tx.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } });
            if (loginOnEmail) {
                throw new AccountActionError(
                    409,
                    'ACCOUNT_CONFLICT',
                    'A login that is linked to a different student, teacher or admin already uses this email. Its password was NOT changed and no new account was created. Use "Send Password Reset Email" for that login instead.'
                );
            }
            const decision = decideSignupRole(await findEligibleLoginRoles(email, tx));
            if (decision.kind !== 'ROLE' || decision.role !== 'STUDENT') {
                throw new AccountActionError(409, 'AMBIGUOUS_EMAIL', 'This email is shared with another school record (for example a teacher), so a login cannot be created automatically. No account was created.');
            }

            await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    role: 'STUDENT', // never student.role
                    studentId,
                    isEmailVerified: true
                }
            });
        });
    } catch (e) {
        if (e instanceof AccountActionError) throw e;
        if ((e as { code?: string } | null)?.code === 'P2002') {
            throw new AccountActionError(409, 'ACCOUNT_CONFLICT', 'A login with this email was created at the same moment. Nothing was changed.');
        }
        throw e;
    }
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
