import { customError } from '../../utils/customError';
import { db } from '../../utils/db.server';

export async function createClasswork(termSubjectLevelId: string, uploaderId: string, uploadedUserRole: string, title: string, description = 'No description', attachments: string[] | undefined) {
    const subject = await db.subject.findUnique({ where: { id: +termSubjectLevelId } });
    // if (!subject) {
    //     throw customError('Subject not found', 'fail', 404, true);
    // }

    let uploader;
    if (uploadedUserRole === 'TEACHER') {
        uploader = await db.teacher.findUnique({ where: { id: +uploaderId } });
    } else if (uploadedUserRole === 'ADMIN') {
        uploader = await db.admin.findUnique({ where: { id: +uploaderId } });
    } else {
        throw customError('Invalid role', 'fail', 400, true);
    }
    if (!uploader) {
        throw customError('Uploader not found', 'fail', 404, true);
    }

    let newClasswork;

    if (uploadedUserRole === 'TEACHER') {
        const data = {
            subjectId: 1,
            termSubjectLevelId: +termSubjectLevelId,
            teacherId: +uploaderId,
            adminId: null,
            uploadedUserRole,
            title,
            description: description || 'No description or content',
            attachments: attachments || [],
            dueDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        newClasswork = await db.classwork.create({ data });
    } else if (uploadedUserRole === 'ADMIN') {
        const data = {
            subjectId: 1,
            termSubjectLevelId: +termSubjectLevelId,
            teacherId: null,
            adminId: +uploaderId,
            uploadedUserRole,
            title,
            description: description || 'No description or content',
            attachments: attachments || [],
            dueDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        newClasswork = await db.classwork.create({ data });
    } else {
        throw customError('Invalid role', 'fail', 400, true);
    }

    if (!newClasswork) {
        throw customError('Failed to create classwork', 'fail', 400, true);
    }

    return newClasswork;
}

/* Find all homework records for a list of subjects */
export async function findAllClassworksBySubjectsList(termSubjectLevelIdsArray: string[], teacherId: string) {
    // const subjectIds = subjectIdsArray;
    const numerictermSubjectLevelIds = termSubjectLevelIdsArray.map(Number);

    const homeworks = await db.classwork.findMany({
        where: {
            termSubjectLevelId: {
                in: numerictermSubjectLevelIds
            },
            teacherId: +teacherId
        },
        include: {
            subject: true,
            teacher: true,
            termSubjectLevel: {
                select: {
                    level: {
                        select: { name: true }
                    }
                }
            }
        }
    });

    return homeworks;
}
