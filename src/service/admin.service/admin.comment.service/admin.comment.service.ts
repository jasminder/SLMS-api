import { db } from '../../../utils/db.server';
import { customError } from '../../../utils/customError';
import { InteractionType } from '@prisma/client';

export async function createComment(studentId: string, adminId: string, content: string, interactionType: InteractionType) {
    return await db.$transaction(async (db) => {
        const comment = await db.comment.create({
            data: {
                student: { connect: { id: +studentId } },
                admin: { connect: { id: +adminId } },
                content,
                interactionType
            }
        });

        const interaction = await db.interaction.create({
            data: {
                student: { connect: { id: +studentId } },
                interactionType,
                description: `Comment: ${content}`,
                contactedDate: new Date(),
                createdBy: +adminId
            }
        });

        return { comment, interaction };
    });
}

export async function getCommentsByStudentId(studentId: string) {
    return await db.comment.findMany({
        where: {
            studentId: +studentId
        },
        orderBy: {
            createdAt: 'desc' // Orders the comments by the 'createdAt' field in descending order
        },
        // Include any additional data if needed, e.g., details about the admin who made the comment
        include: {
            admin: {
                include: { adminPersonalDetails: true }
            }
        }
    });
}
