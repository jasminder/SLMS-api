/**
 * Pure rule for deciding which role a new login gets at signup (no database, no imports).
 *
 * Before: the lookups ran admin -> teacher -> student and the LAST match won, so an email shared by a
 * teacher and a student silently became a STUDENT login.
 * Now: exactly ONE eligible profile type is required. If an email is eligible under more than one type
 * (e.g. a teacher and a student sharing a family email), no login is created automatically and the
 * school must resolve it. Existing logins are never touched by this rule.
 */
export type SignupRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export type SignupRoleDecision = { kind: 'ROLE'; role: SignupRole } | { kind: 'AMBIGUOUS' } | { kind: 'NONE' };

export const AMBIGUOUS_SIGNUP_MESSAGE = 'This email is shared by more than one school record, so an account cannot be created automatically. Please contact the school office.';

export const decideSignupRole = (eligibleRoles: SignupRole[]): SignupRoleDecision => {
    const distinct = Array.from(new Set(eligibleRoles));
    if (distinct.length === 0) return { kind: 'NONE' };
    if (distinct.length > 1) return { kind: 'AMBIGUOUS' };
    return { kind: 'ROLE', role: distinct[0] };
};
