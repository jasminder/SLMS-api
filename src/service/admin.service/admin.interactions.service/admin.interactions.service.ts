import { db } from '../../../utils/db.server';
import { customError } from '../../../utils/customError';

export async function getInteractionsByStudentId(studentId: string) {
    return await db.interaction.findMany({
        where: {
            studentId: +studentId
        },
        take: 10, // Take the last 10 records
        orderBy: {
            createdAt: 'desc' // Order by creation date in descending order
        },
        // Include additional data if needed, like details about the admin who recorded the interaction
        include: {
            student: {
                include: {
                    personalDetails: true
                }
            } // Assuming there is a relation to an 'Admin' model
        }
    });
}
