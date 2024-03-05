import { db } from '../../../../utils/db.server';
import { customError } from '../../../../utils/customError';
import { UpdateTeacherPersonalDetailSchema } from '../../../../schema/admin.dto/admin.teacher.dto/admin.teacher.update.dto/admin.teacher.update.dto';

export async function updateTeacherPersonalDetail(id: string, data: UpdateTeacherPersonalDetailSchema['body']['data']) {
    const { firstName, lastName, DOB, gender, email, contact, address, suburb, state, country, postcode, image } = data;

    // Add logic to check if email or contact already exists
    const existingTeacher = await db.teacherPersonalDetails.findFirst({
        where: {
            OR: [{ email }, { contact }]
        }
    });

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
