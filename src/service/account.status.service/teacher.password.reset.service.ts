import crypto from 'crypto';
import { sendEmail } from '../../utils/email';
import { existingUserForgotPassword, existingUserForgotPasswordSendMailError } from '../auth.service/auth.service';
import { AccountActionError } from './account.action.error';
import { assertTeacherPasswordActionAllowed, getTeacherAccountState, maskEmail } from './teacher.account.status.service';

/** Dedicated wording for a newly created teacher login (the normal reset email keeps its own wording). */
export const teacherSetupEmail = (setupUrl: string) => ({
    subject: 'Set your password at Akal Shaouni',
    text: `An Akal Shaouni teacher account has been created for you. Please visit ${setupUrl} to set your password. This link is valid for 1 hour. If you were not expecting this email, you can ignore it and no password will be set.`
});

/**
 * Admin action "Send Password Reset Email" for a TEACHER.
 *
 * Unlike the public forgot-password endpoint (which resets whatever login owns an email), this action:
 *  - starts from the TEACHER and only proceeds when the account status is ACTIVE or SETUP_PENDING (a TEACHER login
 *    linked to this teacher, for an approved/active/login-enabled teacher; its email may differ from the profile email);
 *  - sends only to that linked login's own email, never to an address supplied by the browser;
 *  - refuses (without sending anything) for no account, a conflicting login or an ineligible teacher;
 *  - never creates a login.
 * If the mail relay rejects the message the stored token is removed again.
 *
 * While the login's setup is still pending (an admin created it and the teacher has not set a password), the message
 * is the dedicated "Set your password" email; the existing one-hour reset link and reset page are used either way.
 */
export async function sendTeacherPasswordResetEmail(teacherId: number, clientUrl: string) {
    if (!Number.isInteger(teacherId)) {
        throw new AccountActionError(404, 'TEACHER_NOT_FOUND', 'Teacher not found.');
    }
    const state = await getTeacherAccountState(teacherId);
    if (!state) {
        throw new AccountActionError(404, 'TEACHER_NOT_FOUND', 'Teacher not found.');
    }
    assertTeacherPasswordActionAllowed(state.view, 'SEND_RESET_EMAIL');
    const settingUp = state.view.status === 'SETUP_PENDING';

    const loginEmail = state.internal.linkedLoginEmail as string;
    const resetToken = crypto.randomBytes(32).toString('hex');
    const user = await existingUserForgotPassword(loginEmail, resetToken);

    // The login on that email must still be the one linked to this teacher; otherwise something changed
    // since the check: remove the token again and send nothing.
    if (!user || user.id !== state.internal.linkedLoginId) {
        if (user) await existingUserForgotPasswordSendMailError(loginEmail);
        throw new AccountActionError(409, 'ACCOUNT_CONFLICT', "A login on this teacher's email belongs to a different account. Nothing was sent.");
    }

    // Setup links carry ?setup=1 so the page can say "Set Your Password". It is only a display hint: the token is validated
    // exactly the same way and the normal reset link (no marker) is unchanged.
    const resetUrl = `${clientUrl}/forgot-password/${resetToken}${settingUp ? '?setup=1' : ''}`;
    const message = settingUp ? teacherSetupEmail(resetUrl) : { subject: 'Reset your Password at Akal Shaouni', text: `We have received a request to reset your password. Please visit ${resetUrl} to complete the reset. This link is valid for 1 hour.` };
    const sent = await sendEmail({ email: user.email, subject: message.subject, text: message.text });
    if (!sent) {
        await existingUserForgotPasswordSendMailError(user.email);
        throw new AccountActionError(503, 'EMAIL_NOT_SENT', `We could not send the ${settingUp ? 'setup' : 'reset'} email right now. Please try again later.`);
    }
    return { message: settingUp ? 'Set-your-password email sent' : 'Password reset email sent', sentTo: maskEmail(user.email) };
}
