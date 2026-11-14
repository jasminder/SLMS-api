import { TeacherApplicantSchema } from '../../schema/teacher.applicant.dto/teacher.applicant.dto';
import { customError } from '../../utils/customError';
import { db } from '../../utils/db.server';
import log from '../../utils/logger';
import {
    PUBLIC_EMAIL_CONFLICT_MESSAGE,
    PUBLIC_IDENTITY_CONFLICT_MESSAGE,
    PUBLIC_WWC_CONFLICT_MESSAGE,
    classifyUniqueViolation,
    collectWarningIds,
    dobDayKey,
    findTeacherConflicts,
    findTeacherWarnings,
    identityKey,
    isOperationalError,
    lockIdentity,
    normalizeEmail
} from '../teacher.duplicate.service/teacher.duplicate.service';

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
    // Emails are compared trimmed and case-insensitively, and stored the same way.
    const normalizedEmail = normalizeEmail(email);
    const dateOfBirth = new Date(DOB);
    if (dobDayKey(dateOfBirth) === null) {
        throw customError('Please provide a valid date of birth.', 'fail', 400, true);
    }

    try {
        // One transaction: the duplicate checks and the insert are serialised per identity (advisory lock),
        // so two simultaneous registrations for the same name + DOB cannot both succeed.
        return await db.$transaction(
            async (tx) => {
                const identity = identityKey(firstName, lastName, dateOfBirth);
                if (identity) await lockIdentity(tx, identity);

                // BLOCKING: another teacher (any status, incl. inactive and pending) uses this email,
                // a staff login uses it, or another teacher has the same normalised name + DOB.
                const conflicts = await findTeacherConflicts({ email: normalizedEmail, firstName, lastName, DOB: dateOfBirth }, {}, tx);
                if (conflicts.some((conflict) => conflict.kind === 'EMAIL' || conflict.kind === 'LOGIN_EMAIL')) {
                    throw customError(PUBLIC_EMAIL_CONFLICT_MESSAGE, 'fail', 409, true);
                }
                if (conflicts.some((conflict) => conflict.kind === 'NAME_DOB')) {
                    throw customError(PUBLIC_IDENTITY_CONFLICT_MESSAGE, 'fail', 409, true);
                }

                // NON-BLOCKING: shared phone, possible duplicate, or an email shared with a student/family record.
                // Logged with ids only; admins see them again when the application is reviewed for approval.
                const warnings = await findTeacherWarnings(
                    { email: normalizedEmail, firstName, lastName, DOB: dateOfBirth, contact, address, postcode, bankBsb: BSB, bankAccount: accountNumber },
                    {},
                    tx
                );
                if (warnings.length > 0) {
                    log.warn(
                        { codes: warnings.map((warning) => warning.code), teacherIds: collectWarningIds(warnings, 'teacherIds'), studentIds: collectWarningIds(warnings, 'studentIds') },
                        'Teacher application has non-blocking duplicate/shared-contact warnings; shown to admins at approval'
                    );
                }

                return tx.teacher.create({
                    data: {
                        teacherPersonalDetails: {
                            create: {
                                firstName,
                                lastName,
                                DOB: dateOfBirth,
                                gender,
                                email: normalizedEmail,
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
            },
            { timeout: 15000 }
        );
    } catch (e) {
        // Errors created with customError (the duplicate messages above) pass through unchanged.
        if (isOperationalError(e)) throw e;
        // Database unique violation (the checks above catch the normal cases; this covers races and the WWC card number).
        // Say WHICH rule was broken: a reused WWC number must not be reported as an email problem.
        if ((e as { code?: string } | null)?.code === 'P2002') {
            const kind = classifyUniqueViolation(e);
            if (kind === 'WWC') throw customError(PUBLIC_WWC_CONFLICT_MESSAGE, 'fail', 409, true);
            if (kind === 'EMAIL') throw customError(PUBLIC_EMAIL_CONFLICT_MESSAGE, 'fail', 409, true);
            throw customError(PUBLIC_IDENTITY_CONFLICT_MESSAGE, 'fail', 409, true);
        }
        throw customError('Failed to create application with ', 'fail', 404, true); // Return an error message.
    }
}
