import { customError } from '../../../utils/customError';
import { db } from '../../../utils/db.server';

export async function findStudentsByEmail(email: string) {
    const students = await db.student.findMany({
        where: {
            personalDetails: {
                email: email
            }
        },
        include: {
            personalDetails: true
        }
    });

    if (students.length === 0) {
        throw customError(`No students found with email ${email}`, 'fail', 404, true);
    }

    return students;
}
