import type { Prisma } from '@prisma/client';
import { db } from '../../utils/db.server';
import { normalizeEmail } from '../teacher.duplicate.service/teacher.duplicate.rules';
import { AccountActionError } from './account.action.error';
import { isPendingSetupPassword } from './pending.setup.rules';
import type { TeacherAccountDecision } from './teacher.account.status.rules';
import { decideTeacherAccountStatus, maskEmail } from './teacher.account.status.rules';

export * from './teacher.account.status.rules';

/** Works with the normal client and with an interactive-transaction client. */
export type AccountStatusReader = Pick<Prisma.TransactionClient, 'teacher' | 'user' | 'personalDetails'>;

/** What the admin screen receives. Contains no password data and only MASKED emails. */
export type TeacherAccountStatusView = TeacherAccountDecision & {
    teacherId: number;
    teacher: { role: string; isActive: boolean; isAllowedLogin: boolean };
    profileEmailMasked: string;
    login: { exists: boolean; role?: string; isActive?: boolean; emailMasked?: string };
    loginOnProfileEmail: { role: string; linkedTo: 'THIS_TEACHER' | 'OTHER_TEACHER' | 'STUDENT' | 'ADMIN' | 'NONE' } | null;
    sharedStudentIds: number[];
};

/** Server-side only: never sent to the browser. */
export type TeacherAccountInternal = { linkedLoginId: number | null; linkedLoginEmail: string | null };

/**
 * Reads the real User/profile relationships for one teacher and decides the account status.
 * Read-only. Returns null when the teacher does not exist.
 */
export async function getTeacherAccountState(teacherId: number, client: AccountStatusReader = db): Promise<{ view: TeacherAccountStatusView; internal: TeacherAccountInternal } | null> {
    const teacher = await client.teacher.findUnique({
        where: { id: teacherId },
        select: { id: true, role: true, isActive: true, isAllowedLogin: true, teacherPersonalDetails: { select: { email: true } } }
    });
    if (!teacher) return null;

    const profileEmail = normalizeEmail(teacher.teacherPersonalDetails?.email);

    // The login that is actually LINKED to this teacher (User.teacherId), not a login found by email.
    // The password is read ONLY to tell whether the exact pending-setup marker is stored; it is reduced to a boolean
    // here and never copied into the view or the internal state.
    const linkedRow = await client.user.findFirst({ where: { teacherId }, select: { id: true, email: true, role: true, isActive: true, password: true } });
    const linkedLogin = linkedRow ? { id: linkedRow.id, email: linkedRow.email, role: linkedRow.role, isActive: linkedRow.isActive, setupPending: isPendingSetupPassword(linkedRow.password) } : null;
    // Whatever login uses the profile email (it may belong to another person or another role).
    const emailLogin = profileEmail
        ? await client.user.findFirst({ where: { email: { equals: profileEmail, mode: 'insensitive' } }, select: { id: true, role: true, teacherId: true, studentId: true, adminId: true } })
        : null;
    const sharedStudents = profileEmail ? await client.personalDetails.findMany({ where: { email: { equals: profileEmail, mode: 'insensitive' } }, select: { studentId: true } }) : [];
    const sharedStudentIds = sharedStudents.map((student) => student.studentId);

    const decision = decideTeacherAccountStatus({
        teacher: { id: teacher.id, role: teacher.role, isActive: teacher.isActive, isAllowedLogin: teacher.isAllowedLogin },
        profileEmail,
        linkedLogin,
        emailLogin,
        sharedStudentIds
    });

    let linkedTo: NonNullable<TeacherAccountStatusView['loginOnProfileEmail']>['linkedTo'] = 'NONE';
    if (emailLogin) {
        if (emailLogin.teacherId === teacher.id) linkedTo = 'THIS_TEACHER';
        else if (emailLogin.teacherId !== null) linkedTo = 'OTHER_TEACHER';
        else if (emailLogin.studentId !== null) linkedTo = 'STUDENT';
        else if (emailLogin.adminId !== null) linkedTo = 'ADMIN';
    }

    return {
        view: {
            ...decision,
            teacherId: teacher.id,
            teacher: { role: teacher.role, isActive: teacher.isActive, isAllowedLogin: teacher.isAllowedLogin },
            profileEmailMasked: maskEmail(profileEmail),
            login: linkedLogin ? { exists: true, role: linkedLogin.role, isActive: linkedLogin.isActive, emailMasked: maskEmail(linkedLogin.email) } : { exists: false },
            loginOnProfileEmail: emailLogin ? { role: emailLogin.role, linkedTo } : null,
            sharedStudentIds
        },
        internal: { linkedLoginId: linkedLogin?.id ?? null, linkedLoginEmail: linkedLogin?.email ?? null }
    };
}

export type TeacherPasswordAction = 'CHANGE_PASSWORD' | 'SEND_RESET_EMAIL';

/**
 * The single gate every teacher password action goes through (change password, send reset/setup email).
 * Throws a clear AccountActionError unless the account status allows that action:
 *  - ACTIVE: both actions.
 *  - SETUP_PENDING: only sending the setup email again (an admin must not set a password around the teacher).
 * Nothing here ever creates or links a login.
 */
export function assertTeacherPasswordActionAllowed(view: TeacherAccountStatusView, action: TeacherPasswordAction = 'CHANGE_PASSWORD'): void {
    switch (view.status) {
        case 'ACTIVE':
            return;
        case 'SETUP_PENDING':
            if (action === 'SEND_RESET_EMAIL') return;
            throw new AccountActionError(
                409,
                'SETUP_PENDING',
                "This teacher's login is waiting for the teacher to set a password. A password cannot be set for them. Use \"Resend Set-Your-Password Email\" instead."
            );
        case 'NO_ACCOUNT':
            throw new AccountActionError(404, 'NO_ACCOUNT', 'This teacher has no login account yet, so a password cannot be changed or reset. No account was created.');
        case 'ACCOUNT_CONFLICT':
            throw new AccountActionError(409, 'ACCOUNT_CONFLICT', "A login on this teacher's email belongs to a different account or role. Nothing was changed. Resolve the conflict before using password actions.");
        default:
            throw new AccountActionError(409, 'LOGIN_NOT_AVAILABLE', 'Login is not available for this teacher (inactive, not approved, or login not enabled). Nothing was changed.');
    }
}
