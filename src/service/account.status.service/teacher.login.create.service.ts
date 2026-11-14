import { db } from '../../utils/db.server';
import log from '../../utils/logger';
import { lockIdentity } from '../teacher.duplicate.service/teacher.duplicate.service';
import { normalizeEmail } from '../teacher.duplicate.service/teacher.duplicate.rules';
import { AccountActionError } from './account.action.error';
import { PENDING_SETUP_PASSWORD } from './pending.setup.rules';
import { getTeacherAccountState, maskEmail } from './teacher.account.status.service';
import { sendTeacherPasswordResetEmail } from './teacher.password.reset.service';

export type CreateTeacherLoginInput = {
    loginEmail: string;
    confirmLoginEmail: string;
    /** The admin explicitly confirms that this address belongs to the intended teacher. Must be exactly `true`. */
    ownershipConfirmed: boolean;
};

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Admin action "Create Teacher Login".
 *
 * Creates ONE login for ONE approved teacher, on a separate, school-confirmed email, and sends the "Set your password"
 * email. It changes nothing else:
 *  - Teacher.email (the profile contact email) is not touched, and no existing User, student/family login, role or
 *    activation flag is changed. No User.isActive / isEmailVerified changes.
 *  - The new User is linked through teacherId, has role TEACHER, and stores the exact pending-setup marker as its
 *    password. It cannot log in (loginUser / existingAuthUser reject the marker) until the teacher completes the
 *    emailed link, which replaces the marker with a bcrypt hash through the normal reset flow.
 *  - The login email must be unique across ALL logins and must not be anyone else's profile email: not another
 *    teacher's, an admin's, or any student's. (The teacher's own profile email is allowed only when no student/admin
 *    shares it.) So a shared family email can never be claimed by a teacher login.
 *  - Duplicate creation is serialised by transaction-scoped advisory locks (per teacher and per login email,
 *    always taken in the same order), with the unique indexes on User.email / User.teacherId as a final backstop.
 * If the email cannot be sent the pending login is KEPT and the admin is told to re-send; the email is never reported as sent.
 */
export async function createTeacherLogin(teacherId: number, input: CreateTeacherLoginInput, clientUrl: string) {
    if (!Number.isInteger(teacherId)) {
        throw new AccountActionError(404, 'TEACHER_NOT_FOUND', 'Teacher not found.');
    }
    if (input.ownershipConfirmed !== true) {
        throw new AccountActionError(400, 'OWNERSHIP_NOT_CONFIRMED', 'Please confirm that this email address belongs to this teacher before creating the login.');
    }
    const loginEmail = normalizeEmail(input.loginEmail);
    if (!loginEmail || !EMAIL_SHAPE.test(loginEmail)) {
        throw new AccountActionError(400, 'LOGIN_EMAIL_INVALID', 'Please enter a valid login email address.');
    }
    if (loginEmail !== normalizeEmail(input.confirmLoginEmail)) {
        throw new AccountActionError(400, 'LOGIN_EMAIL_INVALID', 'The two login email addresses do not match.');
    }

    let userId: number;
    try {
        userId = await db.$transaction(
            async (tx) => {
                // Same order for every request (sorted), so two requests can never wait on each other's locks.
                for (const key of [`teacher-login:${teacherId}`, `login-email:${loginEmail}`].sort()) {
                    await lockIdentity(tx, key);
                }

                const state = await getTeacherAccountState(teacherId, tx);
                if (!state) {
                    throw new AccountActionError(404, 'TEACHER_NOT_FOUND', 'Teacher not found.');
                }
                switch (state.view.status) {
                    case 'NO_ACCOUNT':
                        break;
                    case 'ACTIVE':
                    case 'SETUP_PENDING':
                        throw new AccountActionError(409, 'LOGIN_ALREADY_EXISTS', 'This teacher already has a login. No second login was created.');
                    case 'ACCOUNT_CONFLICT':
                        throw new AccountActionError(409, 'ACCOUNT_CONFLICT', "A login on this teacher's email or linked to this teacher needs review first. Nothing was created.");
                    default:
                        throw new AccountActionError(409, 'LOGIN_NOT_AVAILABLE', 'This teacher must be approved, active and allowed to log in before a login can be created. Nothing was created.');
                }

                const existingLogin = await tx.user.findFirst({ where: { email: { equals: loginEmail, mode: 'insensitive' } }, select: { id: true } });
                if (existingLogin) {
                    throw new AccountActionError(409, 'LOGIN_EMAIL_IN_USE', 'A login with this email already exists. Choose a different email. Nothing was created.');
                }
                const insensitive = { equals: loginEmail, mode: 'insensitive' as const };
                const [otherTeacher, adminProfile, studentProfile] = await Promise.all([
                    tx.teacherPersonalDetails.findFirst({ where: { email: insensitive, teacherId: { not: teacherId } }, select: { teacherId: true } }),
                    tx.adminPersonalDetails.findFirst({ where: { email: insensitive }, select: { adminId: true } }),
                    tx.personalDetails.findFirst({ where: { email: insensitive }, select: { studentId: true } })
                ]);
                if (otherTeacher || adminProfile || studentProfile) {
                    throw new AccountActionError(
                        409,
                        'LOGIN_EMAIL_BELONGS_TO_PROFILE',
                        'This email is already on file for another person (a teacher, admin, student or family). Use a separate email that belongs only to this teacher. Nothing was created.'
                    );
                }

                const created = await tx.user.create({
                    data: { email: loginEmail, password: PENDING_SETUP_PASSWORD, role: 'TEACHER', teacherId },
                    select: { id: true }
                });
                return created.id;
            },
            { timeout: 15000 }
        );
    } catch (error) {
        if (error instanceof AccountActionError) throw error;
        // Unique index backstop (User.email or User.teacherId): someone created a login at the same moment.
        if ((error as { code?: string } | null)?.code === 'P2002') {
            throw new AccountActionError(409, 'LOGIN_ALREADY_EXISTS', 'A login for this teacher or email was created at the same moment. Refresh the page; nothing else was changed.');
        }
        throw error;
    }

    // The pending login now exists and is committed. Only the email send can still fail, and it can simply be re-sent.
    try {
        const sent = await sendTeacherPasswordResetEmail(teacherId, clientUrl);
        log.info({ teacherId, userId }, 'Teacher login created (setup pending) and set-your-password email sent');
        return { message: 'Teacher login created. A "Set your password" email was sent.', sentTo: sent.sentTo, loginCreated: true as const, emailSent: true as const };
    } catch {
        // Whatever stopped the send, the pending login exists: say so and never claim the email went out.
        log.warn({ teacherId, userId }, 'Teacher login created (setup pending) but the set-your-password email could not be sent');
        throw new AccountActionError(
            503,
            'SETUP_EMAIL_NOT_SENT',
            `The teacher login was created (${maskEmail(loginEmail)}) but the "Set your password" email could NOT be sent. The login stays pending and unusable. Use "Resend Set-Your-Password Email" to try again.`
        );
    }
}
