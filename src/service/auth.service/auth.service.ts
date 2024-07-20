import { Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import { db } from '../../utils/db.server';
import { customError } from '../../utils/customError';

export async function signUpUser(email: string, password: string, confirmPassword: string) {
    // Validate the input
    if (!(email && password && confirmPassword)) {
        throw customError('All input fields are required', 'fail', 400, true);
    }

    // Check if passwords match
    if (password !== confirmPassword) {
        throw customError('Passwords do not match', 'fail', 400, true);
    }

    // Check if user already has login credentials in the User model
    const existingUser = await db.user.findUnique({
        where: { email: email }
    });
    if (existingUser) {
        throw customError('User already exists. Please log in.', 'fail', 400, true);
    }

    // Determine the user's role and check if allowed to login
    const { userRole, isAllowedLogin } = await findUserRoleAndLoginPermission(email);

    if (!isAllowedLogin) {
        throw customError('User is not allowed to sign up. Contact School', 'fail', 400, true);
    }
    if (!userRole) {
        throw customError('No valid role found for the user', 'fail', 400, true);
    }
    // if (userRole === Role.ADMIN) {
    //     throw customError('Registration as ADMIN is not allowed. Please check with school', 'fail', 400, true);
    // }

    // Encrypt user password
    const hashedPassword = await bcrypt.hash(password, 10);
    let teacherId = null;
    let studentId = null;
    let adminId = null;
    if (userRole === Role.TEACHER) {
        const teacher = await db.teacherPersonalDetails.findFirst({ where: { email: email.toLowerCase() } });
        if (!teacher) {
            throw customError('Teacher not found. Please contact the admin.', 'fail', 404, true);
        }
        teacherId = teacher.teacherId;
    } else if (userRole === Role.STUDENT) {
        const student = await db.personalDetails.findFirst({
            where: {
                email: {
                    equals: email,
                    mode: 'insensitive'
                }
            }
        });
        if (!student) {
            throw customError('Student not found. Please contact the admin.', 'fail', 404, true);
        }
        studentId = student.studentId;
    } else if (userRole === Role.ADMIN) {
        const admin = await db.adminPersonalDetails.findUnique({ where: { email: email.toLowerCase() } });
        if (!admin) {
            throw customError('Admin not found. Please contact the school.', 'fail', 404, true);
        }
        adminId = admin.adminId;
    }

    // Create user in your database only after isAllowedLogin is true
    const user = await db.user.create({
        data: {
            email: email.toLowerCase(),
            password: hashedPassword,
            role: userRole,
            adminId: adminId,
            teacherId: teacherId,
            studentId: studentId
        },
        select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            isActive: true,
            isEmailVerified: true,
            admin:
                userRole === 'ADMIN'
                    ? {
                          select: {
                              id: true

                              // other fields you want to select from Admin
                          }
                      }
                    : undefined,
            teacher:
                userRole === 'TEACHER'
                    ? {
                          select: {
                              id: true
                              // other fields you want to select from Teacher
                          }
                      }
                    : undefined,
            student:
                userRole === 'STUDENT'
                    ? {
                          select: {
                              id: true
                              // other fields you want to select from Student
                          }
                      }
                    : undefined
            // Add other fields as needed but exclude 'password'
        }
    });

    // Generate JWT tokens- access token
    const accessToken = jwt.sign({ email: user.email, role: user.role, id: user.id }, process.env.SECRET_STR!, { expiresIn: '1h' });

    // Generate JWT tokens- refresh token token
    const refreshToken = jwt.sign({ email: user.email, role: user.role, id: user.id }, process.env.REFRESH_SECRET_STR!, { expiresIn: '1d' });

    // Return new user data and tokens

    return { user, accessToken, refreshToken };
}

async function findUserRoleAndLoginPermission(email: string): Promise<{ userRole: Role; isAllowedLogin: boolean }> {
    let userRole: Role | null = null;
    let isAllowedLogin = false;

    // Check in AdminPersonalDetails
    const adminDetails = await db.adminPersonalDetails.findUnique({ where: { email } });
    if (adminDetails) {
        const existingAdmin = await db.admin.findUnique({
            where: { id: adminDetails.adminId }
        });
        if (existingAdmin && existingAdmin.isAllowedLogin) {
            userRole = Role.ADMIN;
            isAllowedLogin = existingAdmin.isAllowedLogin;
        }
    }

    // Check in TeacherPersonalDetails
    const teacherDetails = await db.teacherPersonalDetails.findUnique({ where: { email } });
    if (teacherDetails) {
        const existingTeacher = await db.teacher.findUnique({
            where: { id: teacherDetails.teacherId }
        });
        if (existingTeacher && existingTeacher.isAllowedLogin) {
            userRole = Role.TEACHER;
            isAllowedLogin = existingTeacher.isAllowedLogin;
        }
    }

    // Check in PersonalDetails for Student
    const studentDetails = await db.personalDetails.findFirst({
        where: {
            email: {
                equals: email,
                mode: 'insensitive'
            }
        }
    });

    if (studentDetails) {
        const existingStudent = await db.student.findUnique({
            where: { id: studentDetails.studentId }
        });

        if (existingStudent && existingStudent.isAllowedLogin) {
            userRole = Role.STUDENT;
            isAllowedLogin = existingStudent.isAllowedLogin;
        }
    }

    /******RE CONSIDER THIS IF ADMIN SHOULD NOT REGISTER*******/

    // if (userRole === Role.STUDENT) {
    //     throw customError('Registration as student is not allowed. Please check with school', 'fail', 400, true);
    // }

    /******RE CONSIDER THIS IF ADMIN SHOULD NOT REGISTER*******/
    if (!isAllowedLogin) {
        throw customError('User is not allowed to sign up. Contact School  ', 'fail', 400, true);
    }
    // Ensure a valid role is found, otherwise throw an error
    if (!userRole) {
        throw customError('There is no such user. Please contact school', 'fail', 400, true);
    }

    return { userRole, isAllowedLogin };
}

/*Login user*/
export async function loginUser(email: string, password: string) {
    // Find the user by email
    const user = await db.user.findFirst({
        where: {
            email: {
                equals: email,
                mode: 'insensitive'
            }
        }
    });

    if (!user) {
        throw customError('User not found', 'fail', 404, true);
    }

    // Verify the password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
        throw customError('Invalid password', 'fail', 401, true);
    }

    // Check additional conditions based on the role
    let isAllowedLogin = false;
    let isActive = false;

    if (user.role === 'ADMIN' && user.adminId) {
        const admin = await db.admin.findUnique({ where: { id: user.adminId } });
        isAllowedLogin = admin?.isAllowedLogin ?? false;
        isActive = admin?.isActive ?? false;
    } else if (user.role === 'TEACHER' && user.teacherId) {
        const teacher = await db.teacher.findUnique({ where: { id: user.teacherId } });
        isAllowedLogin = teacher?.isAllowedLogin ?? false;
        isActive = teacher?.isActive ?? false;
    } else if (user.role === 'STUDENT' && user.studentId) {
        const student = await db.student.findUnique({ where: { id: user.studentId } });
        isAllowedLogin = student?.isAllowedLogin ?? false;
        isActive = student?.isActive ?? false;
    }

    if (!isAllowedLogin || !isActive) {
        throw customError('User is not allowed to login or not active', 'fail', 403, true);
    }

    const loggedInUser = await db.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            isActive: true,
            isEmailVerified: true,
            admin:
                user.role === 'ADMIN'
                    ? {
                          select: {
                              id: true

                              // other fields you want to select from Admin
                          }
                      }
                    : undefined,
            teacher:
                user.role === 'TEACHER'
                    ? {
                          select: {
                              id: true
                              // other fields you want to select from Teacher
                          }
                      }
                    : undefined,
            student:
                user.role === 'STUDENT'
                    ? {
                          select: {
                              id: true
                              // other fields you want to select from Student
                          }
                      }
                    : undefined
            // Add other fields as needed but exclude 'password'
        }
    });

    // Generate JWT tokens- access token
    const accessToken = jwt.sign({ email: user.email, role: user.role, id: user.id }, process.env.SECRET_STR!, { expiresIn: '600s' });

    // Generate JWT tokens- refresh token token
    const refreshToken = jwt.sign({ email: user.email, role: user.role, id: user.id }, process.env.REFRESH_SECRET_STR!, { expiresIn: '72000s' });

    return { loggedInUser, accessToken, refreshToken };
}

/* get unique authenticated user id*/
export const existingAuthUser = async (email: string, role: string) => {
    const existingUser = await db.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            isActive: true,
            isEmailVerified: true,
            admin:
                role === 'ADMIN'
                    ? {
                          select: {
                              id: true

                              // other fields you want to select from Admin
                          }
                      }
                    : undefined,
            teacher:
                role === 'TEACHER'
                    ? {
                          select: {
                              id: true
                              // other fields you want to select from Teacher
                          }
                      }
                    : undefined,
            student:
                role === 'STUDENT'
                    ? {
                          select: {
                              id: true
                              // other fields you want to select from Student
                          }
                      }
                    : undefined
            // Add other fields as needed but exclude 'password'
        }
    });
    if (!existingUser) {
        throw customError('Session expired login again', 'fail', 404, true);
    }
    return existingUser;
};

//************** Forgot Password **************

export const existingUserForgotPassword = async (email: string, resetToken: string) => {
    const existingUser = await db.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            isActive: true,
            isEmailVerified: true,
            resetPasswordToken: true,
            resetPasswordTokenExpiresAt: true
            // Add other fields as needed but exclude 'password'
        }
    });

    if (!existingUser) {
        return null;
    }
    const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetPasswordTokenExpiresAt = Math.floor(Date.now() / 1000) + 10 * 60; // This will be in seconds
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await db.user.update({
        where: { id: existingUser.id },
        data: {
            resetPasswordToken: resetPasswordToken,
            resetPasswordTokenExpiresAt: resetPasswordTokenExpiresAt
        }
    });
    return existingUser;
};

export const existingUserForgotPasswordSendMailError = async (email: string) => {
    const existingUser = await db.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            isActive: true,
            isEmailVerified: true,
            resetPasswordToken: true,
            resetPasswordTokenExpiresAt: true
            // Add other fields as needed but exclude 'password'
        }
    });
    if (!existingUser) {
        throw customError('There is no such user with this email', 'fail', 404, true);
    }
    await db.user.update({
        where: { id: existingUser.id },
        data: {
            resetPasswordToken: null,
            resetPasswordTokenExpiresAt: null
        }
    });
    return existingUser;
};

export const findUserByResetToken = async (token: string) => {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const currentTimeInSeconds = Math.floor(Date.now() / 1000);

    const user = await db.user.findFirst({
        where: {
            resetPasswordToken: hashedToken,
            resetPasswordTokenExpiresAt: {
                gt: currentTimeInSeconds
            }
        },
        select: {
            id: true,
            email: true,
            role: true,
            resetPasswordToken: true

            // Add other fields as needed but exclude 'password'
        }
    });

    return user;
};

export const resetUserPassword = async (email: string, newPassword: string) => {
    const hashedPassword = await bcrypt.hash(newPassword, 12); // Replace '12' with the desired salt rounds

    await db.user.update({
        where: { email },
        data: {
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordTokenExpiresAt: null,
            updatedAt: new Date() // Sets the updatedAt field to the current date and time
        }
    });
};
