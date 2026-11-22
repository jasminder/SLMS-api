import { NewApplicantSchema } from '../../schema/new.applicant.dto/new.applicant.dto';
import { customError } from '../../utils/customError';
import { db } from '../../utils/db.server';
import { sendEmail } from '../../utils/email';
import { findTeacherConflicts } from '../teacher.duplicate.service/teacher.duplicate.service';
import { parseISO, startOfDay } from 'date-fns';
import { toZonedTime, format } from 'date-fns-tz';

export type CheckEmailApplicationType = 'teacher' | 'student';

/**
 * PUBLIC (unauthenticated) response. Deliberately minimal: it says only whether the email cannot be used for this
 * form. It never says why, and never which kind of record or role (teacher, student, admin, application or login)
 * is behind it, so the endpoint cannot be used to learn who an email belongs to.
 */
export type CheckEmailResult = { emailTaken: boolean };

/** True when a student record (any status) has this email as its contact email. Case-insensitive. */
export async function isStudentEmail(email: string, client: { personalDetails: { findFirst: typeof db.personalDetails.findFirst } } = db): Promise<boolean> {
    const found = await client.personalDetails.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } });
    return found !== null;
}

/**
 * Check if email is already registered (User table) or has an existing application
 * (TeacherPersonalDetails or PersonalDetails). Validates role type before allowing submission.
 */
export async function checkEmailForApplication(
    email: string,
    applicationType: CheckEmailApplicationType
): Promise<CheckEmailResult> {
    const normalizedEmail = email?.trim()?.toLowerCase();
    if (!normalizedEmail) {
        return { emailTaken: false };
    }

    // Check existing User (already has login / registered)
    const existingUser = await db.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
        select: { role: true }
    });
    // Siblings intentionally share one email: a student application on an email that already belongs
    // to a STUDENT account is the sibling flow, so allow it. A student application is blocked when the
    // email belongs to a TEACHER/ADMIN login (staff email can't become a student).
    // A TEACHER application is blocked by ANY login on the email (student, teacher or admin), by a student record
    // with that email, or by another teacher record (Scope of Work A5: a student's email cannot be used for a
    // teacher). One email can only hold one login, so a teacher on a family email could never get a teacher login.
    const blockedByLogin = applicationType === 'student' ? existingUser !== null && existingUser.role !== 'STUDENT' : existingUser !== null;
    if (blockedByLogin) {
        return { emailTaken: true };
    }

    if (applicationType === 'teacher') {
        if (await isStudentEmail(normalizedEmail)) {
            return { emailTaken: true };
        }
        // Case-insensitive, any status (active, inactive, pending). Name + DOB is checked when the form is submitted.
        const conflicts = await findTeacherConflicts({ email: normalizedEmail }, { checkIdentity: false });
        if (conflicts.some((conflict) => conflict.kind === 'EMAIL')) {
            return { emailTaken: true };
        }
    }

    return { emailTaken: false };
}

//  create new application
export async function createApplicant(data: NewApplicantSchema['body']) {
    const {
        emergencyContact: { contactNumber, contactPerson, relationship },
        healthInformation: { allergy, medicalCondition, medicareNumber, ambulanceMembershipNumber },
        otherInformation: { declaration, otherInfo },
        parentsDetails: { fatherName, motherName, parentContact, parentEmail },
        personalDetails: { email, address, contact, country, firstName, gender, lastName, postcode, state, suburb, DOB, image },
        subjectInterest: { subjectsChosen, subjectRelated }
    } = data;
    const melbourneTimeZone = 'Australia/Melbourne';
    const parsedDOB = parseISO(DOB);
    const melbourneDOB = toZonedTime(parsedDOB, melbourneTimeZone);
    const normalizedDOB = startOfDay(melbourneDOB);
    const formattedDOB = format(normalizedDOB, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", { timeZone: melbourneTimeZone });
    const DOBDate = formattedDOB;

    // Convert the input DOB to a Date object and extract the UTC date parts
    const dobUTC = new Date(DOB);
    const dobDateOnlyUTC = `${dobUTC.getUTCFullYear()}-${(dobUTC.getUTCMonth() + 1).toString().padStart(2, '0')}-${dobUTC.getUTCDate().toString().padStart(2, '0')}`;

    const start = new Date(dobDateOnlyUTC);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(dobDateOnlyUTC);
    end.setUTCHours(23, 59, 59, 999);

    // Find existing student by first and last name, then compare DOB considering timezone
    const existingStudents = await db.personalDetails.findMany({
        where: {
            firstName: {
                equals: firstName.trim(),
                mode: 'insensitive'
            },
            lastName: {
                equals: lastName.trim(),
                mode: 'insensitive'
            },
            gender: {
                equals: gender.trim(),
                mode: 'insensitive'
            },
            DOB: {
                gte: start,
                lte: end
            }
        }
    });

    if (existingStudents.length > 0) {
        for (const student of existingStudents) {
            const studentDOB = new Date(student.DOB);
            const studentDOBInMelbourne = new Date(studentDOB.toLocaleString('en-US', { timeZone: melbourneTimeZone }));
            const studentDOBDateOnly = `${studentDOBInMelbourne.getFullYear()}-${(studentDOBInMelbourne.getMonth() + 1).toString().padStart(2, '0')}-${studentDOBInMelbourne
                .getDate()
                .toString()
                .padStart(2, '0')}`;
            if (studentDOBDateOnly === dobDateOnlyUTC) {
                throw customError(`The name, DOB given is already used for submitting an application. `, 'fail', 404, true);
            }
        }
    }
    // if (existingStudent?.email) {
    //     if (existingStudent.student.role == 'APPLICANT') {
    //         throw customError(`The name, DOB given is already used for submitting an application. `, 'fail', 404, true);
    //     } else if (existingStudent.student.role == 'STUDENT') {
    //         throw customError(`The name, DOB given belongs to an existing student. `, 'fail', 404, true);
    //     } else if (existingStudent.student.role == 'ALUMNI') {
    //         throw customError(`The name, DOB given belongs to an alumni. please contact the school. `, 'fail', 404, true);
    //     }
    // }
    try {
        const student = await db.student.create({
            data: {
                personalDetails: {
                    create: {
                        firstName: firstName.trim(),
                        lastName: lastName.trim(),
                        DOB: DOBDate,
                        gender,
                        email: email.toLowerCase().trim(),
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
        const template = await db.emailTemplate.findFirst({});
        if (student && template) {
            const resonse = await sendEmail({
                email: email,
                subject: template.subject,
                text: template.text
            });
        }
        return student;
    } catch (e) {
        // console.log(e);
        throw customError('Failed to create application', 'fail', 404, true); // Return an error message.
    }
}

/*To select the active term and its subjects and to display it in Application subjects section*/
export async function findPublishTerm() {
    const publishTerm = await db.term.findFirst({
        where: {
            isPublish: true
        },
        select: {
            id: true,
            name: true,
            isPublish: true,
            currentTerm: true,
            automatedAttendanceEnabled: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            updatedAt: true,
            termSubject: {
                select: {
                    id: true,
                    subject: true,
                    level: true,
                    isOnSunday: true,
                    isOnWeekday: true
                }
            },
            termSubjectGroup: {
                select: {
                    id: true,
                    fee: true,
                    subjectGroup: true
                }
            },
            studentTermFee: {
                select: {
                    student: {
                        select: {
                            id: true,
                            isActive: true,
                            role: true
                        }
                    }
                }
            }
        }
    });

    if (!publishTerm) {
        throw customError(`Pubslished Term could not found. Please try again later`, 'fail', 404, true);
    }

    return publishTerm;
}
