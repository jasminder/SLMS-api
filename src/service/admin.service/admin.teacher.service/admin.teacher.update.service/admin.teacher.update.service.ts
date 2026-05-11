import bcrypt from 'bcrypt';
import { db } from '../../../../utils/db.server';
import { customError } from '../../../../utils/customError';
import { UpdateTeacherPersonalDetailSchema } from '../../../../schema/admin.dto/admin.teacher.dto/admin.teacher.update.dto/admin.teacher.update.dto';

// Update teacher password (admin direct change)
export async function updateTeacherPassword(id: string, newPassword: string, confirmPassword: string) {
    if (newPassword !== confirmPassword) {
        throw customError('Passwords do not match', 'fail', 400, true);
    }
    const user = await db.user.findFirst({
        where: { teacherId: +id }
    });
    if (!user) {
        throw customError('Teacher user account not found', 'fail', 404, true);
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
    });
}

export async function updateTeacherPersonalDetail(id: string, data: UpdateTeacherPersonalDetailSchema['body']['data']) {
    const { firstName, lastName, DOB, gender, email, contact, address, suburb, state, country, postcode, image } = data;

    // Check if email or contact already belongs to a different teacher
    const existingTeacher = await db.teacherPersonalDetails.findFirst({
        where: {
            OR: [{ email }, { contact }],
            NOT: { teacher: { id: +id } }
        }
    });

    if (existingTeacher) {
        throw customError('email or contact already exists', 'fail', 400, true);
    }

    try {
        const updatedTeacher = await db.teacher.update({
            where: { id: +id },
            data: {
                teacherPersonalDetails: {
                    update: {
                        firstName,
                        lastName,
                        DOB,
                        gender,
                        email,
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
        return updatedTeacher;
    } catch (e) {
        throw customError(`Failed to update teacher personal details@ksm${e}`, 'fail', 400, true);
    }
}
