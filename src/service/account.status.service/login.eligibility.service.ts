import type { Prisma } from '@prisma/client';
import { normalizeEmail } from '../teacher.duplicate.service/teacher.duplicate.rules';
import type { SignupRole } from '../auth.service/signup.role.rules';

export type EligibilityReader = Pick<Prisma.TransactionClient, 'adminPersonalDetails' | 'admin' | 'teacherPersonalDetails' | 'teacher' | 'student'>;

/**
 * Every profile TYPE an email is eligible to get a login for, using the same eligibility rules as signup
 * (admin/teacher: isAllowedLogin; student: STUDENT role, active, isAllowedLogin). Read-only.
 * Used so an admin action can refuse to create a login when the email is ambiguous (e.g. a teacher AND a student).
 */
export async function findEligibleLoginRoles(rawEmail: string | null | undefined, client: EligibilityReader): Promise<SignupRole[]> {
    const email = normalizeEmail(rawEmail);
    if (!email) return [];
    const insensitive = { equals: email, mode: 'insensitive' as const };
    const roles: SignupRole[] = [];

    const adminDetails = await client.adminPersonalDetails.findFirst({ where: { email: insensitive }, select: { adminId: true } });
    if (adminDetails) {
        const admin = await client.admin.findUnique({ where: { id: adminDetails.adminId }, select: { isAllowedLogin: true } });
        if (admin?.isAllowedLogin) roles.push('ADMIN');
    }

    const teacherDetails = await client.teacherPersonalDetails.findFirst({ where: { email: insensitive }, select: { teacherId: true } });
    if (teacherDetails) {
        const teacher = await client.teacher.findUnique({ where: { id: teacherDetails.teacherId }, select: { isAllowedLogin: true } });
        if (teacher?.isAllowedLogin) roles.push('TEACHER');
    }

    const student = await client.student.findFirst({ where: { role: 'STUDENT', isActive: true, isAllowedLogin: true, personalDetails: { email: insensitive } }, select: { id: true } });
    if (student) roles.push('STUDENT');

    return roles;
}
