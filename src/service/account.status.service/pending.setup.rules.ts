/**
 * "Pending setup" marker for a teacher login that an ADMIN created but the teacher has not yet finished setting up.
 *
 * The marker is stored in `User.password`. It is deliberately NOT a bcrypt hash (bcrypt hashes always start with
 * "$2"), so `bcrypt.compare` can never match it, and `loginUser` / `existingAuthUser` reject this EXACT value
 * explicitly. Completing the emailed "Set your password" link goes through the normal reset flow, which
 * overwrites it with a real bcrypt hash. No activation flag (User.isActive / isEmailVerified) is used or changed.
 *
 * Only this exact value means "pending". Any other non-bcrypt password is NOT treated as pending.
 * Kept free of imports so it can be tested without a database.
 */
export const PENDING_SETUP_PASSWORD = '!SLMS-PENDING-PASSWORD-SETUP!';

export const isPendingSetupPassword = (password: string | null | undefined): boolean => password === PENDING_SETUP_PASSWORD;

/** Shown when someone tries to log in to an account that has not finished password setup. */
export const PENDING_SETUP_LOGIN_MESSAGE = 'Your account is not ready yet. Please use the "Set your password" email the school sent you, or use Forgot Password, to finish setting it up.';
