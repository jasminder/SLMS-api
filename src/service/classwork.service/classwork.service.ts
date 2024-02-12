import { customError } from '../../utils/customError';
import { db } from '../../utils/db.server';

export async function createClasswork(
    termSubjectLevelId: string,
    sectionId: string,
    uploaderId: string,
    uploadedUserRole: string,
    title: string,
    description = 'No description',
    attachments: string[] | undefined
) {
    const subject = await db.subject.findUnique({ where: { id: +termSubjectLevelId } });

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
            sectionId: +sectionId,
            termSubjectLevelId: +termSubjectLevelId,
            teacherId: +uploaderId,
            adminId: null,
            uploadedUserRole,
            title,
            description,
            attachments: attachments || [],
            dueDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        newClasswork = await db.classwork.create({ data });
    } else if (uploadedUserRole === 'ADMIN') {
        const data = {
            subjectId: 1,
            sectionId: +sectionId,
            termSubjectLevelId: +termSubjectLevelId,
            teacherId: null,
            adminId: +uploaderId,
            uploadedUserRole,
            title,
            description,
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

/* Find all classwork records for a list of subjects */
export async function findAllClassworksBySubjectsList(termSubjectLevelIdsArray: string[], teacherId: string) {
    // const subjectIds = subjectIdsArray;
    const numerictermSubjectLevelIds = termSubjectLevelIdsArray.map(Number);

    const classworks = await db.classwork.findMany({
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
            },
            section: {
                select: {
                    name: true
                }
            }
        }
    });

    return classworks;
}

/* Find all classwork records for a termsubjectlevelid and sectionid */
export async function findAllClassworkByTermAndSection(termSubjectLevelId: string, sectionId: string, teacherId: string) {
    const classworks = await db.classwork.findMany({
        where: {
            termSubjectLevelId: +termSubjectLevelId,
            sectionId: +sectionId,
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
            },
            section: {
                select: {
                    name: true
                }
            }
        }
    });

    return classworks;
}
