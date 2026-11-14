/**
 * Pure rule that decides a teacher's login-account status from ACTUAL relationships, never from an email match alone.
 * No imports from the database layer, so it can be tested without one.
 *
 * Facts used:
 *  - the teacher record (approved? active? allowed to log in?)
 *  - the login LINKED to this teacher (User.teacherId = teacher.id), if any, and whether its setup is still pending
 *  - the login that uses the teacher's profile email, if any (it may belong to someone else or another role)
 *  - student profiles that share the profile email (information only; sharing a contact email is allowed)
 *
 * Status precedence (the first that applies wins; every applicable reason is still listed):
 *  LOGIN_NOT_AVAILABLE > ACCOUNT_CONFLICT > SETUP_PENDING > NO_ACCOUNT > ACTIVE
 *
 *  - ACTIVE: a TEACHER login is linked to this teacher, setup is complete, and the teacher is approved, active and
 *    allowed to log in. The login email MAY differ from the profile contact email (a deliberately separate login
 *    email is normal and is not an error). Change Password and Send Password Reset Email are allowed.
 *  - SETUP_PENDING: an admin created the linked login but the teacher has not finished the emailed password setup.
 *    Change Password is NOT allowed; the setup email may be re-sent.
 *  - NO_ACCOUNT: no linked login. An admin may create one (canCreateLogin) with a separate, confirmed email.
 *    A STUDENT/parent login (or student profile) already using the profile email does not block this: that login is
 *    never touched, the new teacher login simply needs a different email.
 *  - ACCOUNT_CONFLICT: the linked login has the wrong role, or (with no linked login) the profile email already
 *    belongs to another teacher's or an admin's login, which needs a human review (possible duplicate person).
 *  - LOGIN_NOT_AVAILABLE: the teacher is not approved/active/allowed to log in, or the linked login is deactivated.
 */
import { normalizeEmail } from '../teacher.duplicate.service/teacher.duplicate.rules';

export type TeacherAccountStatus = 'ACTIVE' | 'SETUP_PENDING' | 'NO_ACCOUNT' | 'ACCOUNT_CONFLICT' | 'LOGIN_NOT_AVAILABLE';

export const TEACHER_ACCOUNT_STATUS_LABELS: Record<TeacherAccountStatus, string> = {
    ACTIVE: 'Account active',
    SETUP_PENDING: 'Setup pending',
    NO_ACCOUNT: 'No account yet',
    ACCOUNT_CONFLICT: 'Account conflict — needs review',
    LOGIN_NOT_AVAILABLE: 'Login not available'
};

export type AccountReasonCode =
    | 'TEACHER_NOT_APPROVED'
    | 'TEACHER_INACTIVE'
    | 'LOGIN_NOT_ALLOWED'
    | 'LOGIN_DEACTIVATED'
    | 'LOGIN_WRONG_ROLE'
    | 'EMAIL_USED_BY_OTHER_LOGIN'
    | 'PROFILE_EMAIL_USED_BY_STUDENT_LOGIN'
    | 'LOGIN_EMAIL_DIFFERS'
    | 'SETUP_PENDING'
    | 'NO_LOGIN'
    | 'SHARED_STUDENT_EMAIL';

export type AccountReason = { code: AccountReasonCode; message: string };

export type TeacherAccountFacts = {
    teacher: { id: number; role: string; isActive: boolean; isAllowedLogin: boolean };
    profileEmail: string | null | undefined;
    /** The login whose teacherId is this teacher. `setupPending` is true only for the exact pending-setup marker. */
    linkedLogin: { id: number; email: string; role: string; isActive: boolean; setupPending?: boolean } | null;
    /** The login (any role) whose email equals the profile email. */
    emailLogin: { id: number; role: string; teacherId: number | null; studentId: number | null; adminId: number | null } | null;
    sharedStudentIds: number[];
};

export type TeacherAccountDecision = {
    status: TeacherAccountStatus;
    label: string;
    canChangePassword: boolean;
    canSendResetEmail: boolean;
    /** An admin may create the teacher's login (with a separate, school-confirmed email). */
    canCreateLogin: boolean;
    reasons: AccountReason[];
};

/** "ra***@ic***.com": enough for an admin to recognise an address without printing it in full. */
export const maskEmail = (email: string | null | undefined): string => {
    const value = (email ?? '').trim();
    const at = value.indexOf('@');
    if (at < 1) return '';
    const domain = value.slice(at + 1);
    const dot = domain.lastIndexOf('.');
    const domainMasked = dot > 0 ? `${domain.slice(0, 2)}***${domain.slice(dot)}` : `${domain.slice(0, 2)}***`;
    return `${value.slice(0, 2)}***@${domainMasked}`;
};

const describeOtherLogin = (login: NonNullable<TeacherAccountFacts['emailLogin']>): string => {
    if (login.teacherId !== null) return 'another teacher';
    if (login.studentId !== null) return 'a student/parent';
    if (login.adminId !== null) return 'an admin';
    return `a ${login.role} account`;
};

export function decideTeacherAccountStatus(facts: TeacherAccountFacts): TeacherAccountDecision {
    const { teacher, linkedLogin, emailLogin, sharedStudentIds } = facts;
    const profileEmail = normalizeEmail(facts.profileEmail);
    const reasons: AccountReason[] = [];

    // 1. Eligibility of the teacher and of the linked login.
    let notAvailable = false;
    if (teacher.role !== 'TEACHER') {
        notAvailable = true;
        reasons.push({ code: 'TEACHER_NOT_APPROVED', message: 'This teacher is not an approved teacher.' });
    }
    if (!teacher.isActive) {
        notAvailable = true;
        reasons.push({ code: 'TEACHER_INACTIVE', message: 'This teacher is inactive.' });
    }
    if (!teacher.isAllowedLogin) {
        notAvailable = true;
        reasons.push({ code: 'LOGIN_NOT_ALLOWED', message: 'Login access has not been enabled for this teacher.' });
    }
    if (linkedLogin && !linkedLogin.isActive) {
        notAvailable = true;
        reasons.push({ code: 'LOGIN_DEACTIVATED', message: "This teacher's login account is deactivated." });
    }

    // 2. Conflicts that need a human review.
    let conflict = false;
    if (linkedLogin && linkedLogin.role !== 'TEACHER') {
        conflict = true;
        reasons.push({ code: 'LOGIN_WRONG_ROLE', message: `The login linked to this teacher has the role ${linkedLogin.role}, not TEACHER.` });
    }
    const otherEmailLogin = emailLogin && (!linkedLogin || emailLogin.id !== linkedLogin.id) ? emailLogin : null;
    if (otherEmailLogin) {
        const isStudentLogin = otherEmailLogin.teacherId === null && otherEmailLogin.adminId === null && otherEmailLogin.studentId !== null;
        if (isStudentLogin) {
            // Family/student login on the shared contact email: never touched, never a conflict for the teacher.
            reasons.push({
                code: 'PROFILE_EMAIL_USED_BY_STUDENT_LOGIN',
                message: 'A student/parent login already uses the profile email. It is not changed. The teacher login must use a different, school-confirmed email.'
            });
        } else if (!linkedLogin) {
            // With no linked login, a TEACHER/ADMIN login on this email may mean the same person has two records.
            conflict = true;
            reasons.push({
                code: 'EMAIL_USED_BY_OTHER_LOGIN',
                message: `A different login (${describeOtherLogin(otherEmailLogin)}, role ${otherEmailLogin.role}) already uses this teacher's email. It was not changed or claimed. Please review.`
            });
        } else {
            reasons.push({ code: 'EMAIL_USED_BY_OTHER_LOGIN', message: `A different login (${describeOtherLogin(otherEmailLogin)}) uses the profile contact email. It is not changed.` });
        }
    }

    // 3. Information only: a separate login email is allowed.
    if (linkedLogin && linkedLogin.role === 'TEACHER' && normalizeEmail(linkedLogin.email) !== profileEmail) {
        reasons.push({ code: 'LOGIN_EMAIL_DIFFERS', message: "This teacher's login uses a different email from the profile contact email. That is allowed when the school has confirmed it." });
    }
    const setupPending = !!linkedLogin && linkedLogin.setupPending === true;
    if (setupPending) {
        reasons.push({ code: 'SETUP_PENDING', message: 'The login was created but the teacher has not set a password yet. The "Set your password" email can be sent again.' });
    }
    if (!linkedLogin) {
        reasons.push({ code: 'NO_LOGIN', message: 'This teacher has no login account yet.' });
    }
    if (sharedStudentIds.length > 0) {
        reasons.push({
            code: 'SHARED_STUDENT_EMAIL',
            message: `This email is also the contact email of Student ${sharedStudentIds.map((id) => `#${id}`).join(', ')}. Sharing a contact email is allowed; it does not give anyone access to the other person's account.`
        });
    }

    let status: TeacherAccountStatus;
    if (notAvailable) status = 'LOGIN_NOT_AVAILABLE';
    else if (conflict) status = 'ACCOUNT_CONFLICT';
    else if (setupPending) status = 'SETUP_PENDING';
    else if (!linkedLogin) status = 'NO_ACCOUNT';
    else status = 'ACTIVE';

    return {
        status,
        label: TEACHER_ACCOUNT_STATUS_LABELS[status],
        canChangePassword: status === 'ACTIVE',
        // Re-sending the setup email is allowed while setup is pending.
        canSendResetEmail: status === 'ACTIVE' || status === 'SETUP_PENDING',
        canCreateLogin: status === 'NO_ACCOUNT',
        reasons
    };
}
