import bcrypt from 'bcrypt';
import { db } from '../../../../utils/db.server';
import { customError } from '../../../../utils/customError';
import { AccountActionError } from '../../../account.status.service/account.action.error';
import { assertTeacherPasswordActionAllowed, getTeacherAccountState } from '../../../account.status.service/teacher.account.status.service';
import { UpdateTeacherPersonalDetailSchema } from '../../../../schema/admin.dto/admin.teacher.dto/admin.teacher.update.dto/admin.teacher.update.dto';
import {
    TeacherDuplicateError,
    addressKey,
    dobDayKey,
    findTeacherConflicts,
    findTeacherWarnings,
    fullNameKey,
    identityKey,
    isOperationalError,
    lockIdentity,
    loginEmailMismatchWarning,
    normalizeEmail,
    normalizePhone
} from '../../../teacher.duplicate.service/teacher.duplicate.service';

// Update teacher password (admin direct change)
//
// Safety rules:
//  - It only ever changes the password of the login LINKED to this teacher (User.teacherId), and only when the
//    account status is ACTIVE (a TEACHER login whose email equals the profile email, for an approved, active,
//    login-enabled teacher). A shared email never makes another person's password changeable.
//  - It NEVER creates a login. A teacher with no account gets a clear error instead.
//  - The status is re-read inside the transaction that performs the update, so the check and the change agree.
export async function updateTeacherPassword(id: string, newPassword: string, confirmPassword: string) {
    if (newPassword !== confirmPassword) {
        throw customError('Passwords do not match', 'fail', 400, true);
    }
    const teacherId = +id;
    if (!Number.isInteger(teacherId)) {
        throw new AccountActionError(404, 'TEACHER_NOT_FOUND', 'Teacher not found.');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db.$transaction(async (tx) => {
        const state = await getTeacherAccountState(teacherId, tx);
        if (!state) {
            throw new AccountActionError(404, 'TEACHER_NOT_FOUND', 'Teacher not found.');
        }
        assertTeacherPasswordActionAllowed(state.view);
        // ACTIVE guarantees a linked login exists; update exactly that row by its id.
        await tx.user.update({
            where: { id: state.internal.linkedLoginId as number },
            data: { password: hashedPassword }
        });
    });
}

export async function updateTeacherPersonalDetail(id: string, data: UpdateTeacherPersonalDetailSchema['body']['data']) {
    const { firstName, lastName, DOB, gender, email, contact, address, suburb, state, country, postcode, image } = data;
    const teacherId = +id;

    // Emails are saved trimmed + lowercased.
    const newEmail = normalizeEmail(email);
    const newDob = new Date(DOB);
    if (dobDayKey(newDob) === null) {
        throw customError('Please provide a valid date of birth.', 'fail', 400, true);
    }

    try {
        return await db.$transaction(
            async (tx) => {
                const current = await tx.teacherPersonalDetails.findUnique({
                    where: { teacherId },
                    select: { firstName: true, lastName: true, DOB: true, email: true, contact: true, address: true, postcode: true }
                });
                if (!current) {
                    throw customError('Teacher not found', 'fail', 404, true);
                }

                // Only values this edit actually CHANGES are validated. Re-saving the same email, phone, name or DOB
                // (or editing an unrelated field) never fails because of a conflict that already existed, so records
                // with a historical duplicate (e.g. Teachers 83 and 86) can still be edited.
                const emailChanged = newEmail !== normalizeEmail(current.email);
                const oldIdentity = identityKey(current.firstName, current.lastName, current.DOB);
                const newIdentity = identityKey(firstName, lastName, newDob);
                const identityChanged = newIdentity !== oldIdentity;
                const phoneChanged = normalizePhone(contact) !== normalizePhone(current.contact);
                const nameOrAddressChanged = fullNameKey(firstName, lastName) !== fullNameKey(current.firstName, current.lastName) || addressKey(address, postcode) !== addressKey(current.address, current.postcode);

                if (identityChanged && newIdentity) await lockIdentity(tx, newIdentity);

                // BLOCKING: a newly introduced duplicate email, a staff login on the new email, or a newly introduced name + DOB match.
                if (emailChanged || identityChanged) {
                    const blocking = await findTeacherConflicts(
                        { email: newEmail, firstName, lastName, DOB: newDob },
                        { excludeTeacherId: teacherId, checkEmail: emailChanged, checkIdentity: identityChanged },
                        tx
                    );
                    if (blocking.length > 0) {
                        throw new TeacherDuplicateError(blocking, [], 'edit');
                    }
                }

                // NON-BLOCKING warnings, only for what changed.
                const bank = await tx.teacherBankDetails.findUnique({ where: { teacherId }, select: { BSB: true, accountNumber: true } });
                const warnings = await findTeacherWarnings(
                    { email: newEmail, firstName, lastName, DOB: newDob, contact, address, postcode, bankBsb: bank?.BSB, bankAccount: bank?.accountNumber },
                    { excludeTeacherId: teacherId, phone: phoneChanged, possibleDuplicates: nameOrAddressChanged, sharedEmail: emailChanged },
                    tx
                );
                if (emailChanged) {
                    // The login email is NOT changed by a profile edit; tell the admin when the two now differ.
                    const login = await tx.user.findFirst({ where: { teacherId }, select: { email: true } });
                    if (login && normalizeEmail(login.email) !== newEmail) warnings.push(loginEmailMismatchWarning());
                }

                const updatedTeacher = await tx.teacher.update({
                    where: { id: teacherId },
                    data: {
                        teacherPersonalDetails: {
                            update: {
                                firstName,
                                lastName,
                                DOB: newDob,
                                gender,
                                email: newEmail,
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
                return { ...updatedTeacher, warnings };
            },
            { timeout: 15000 }
        );
    } catch (e) {
        // Our own errors (duplicate conflict, teacher not found) pass through for the controller to map.
        if (e instanceof TeacherDuplicateError || isOperationalError(e)) throw e;
        // Unique-email violation the lock could not see: report it as a duplicate email.
        if ((e as { code?: string } | null)?.code === 'P2002') {
            throw new TeacherDuplicateError([], [], 'edit');
        }
        throw customError(`Failed to update teacher personal details@ksm${e}`, 'fail', 400, true);
    }
}
