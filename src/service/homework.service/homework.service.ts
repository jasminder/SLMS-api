import { db } from '../../utils/db.server';
import { customError } from '../../utils/customError';

/* Create a new homework record */
export async function createHomework(
    termSubjectLevelId: string,
    sectionId: string,
    uploaderId: string,
    uploadedUserRole: string,
    title: string,
    description = 'No description',
    attachments: string[]
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
    if (uploadedUserRole === 'TEACHER') {
        const data = {
            subjectId: 1,
            sectionId: +sectionId,
            teacherId: +uploaderId,
            adminId: null,
            uploadedUserRole,
            title,
            description,
            attachments,
            createdAt: new Date(),
            updatedAt: new Date(),
            termSubjectLevelId: +termSubjectLevelId
        };
        const newHomework = await db.homework.create({ data });
        if (!newHomework) {
            throw customError('Failed to create homework', 'fail', 400, true);
        }

        return newHomework;
    } else if (uploadedUserRole === 'ADMIN') {
        const data = {
            subjectId: 1,
            sectionId: +sectionId,
            teacherId: null,
            adminId: +uploaderId,
            uploadedUserRole,
            title,
            description,
            attachments,
            createdAt: new Date(),
            updatedAt: new Date(),
            termSubjectLevelId: +termSubjectLevelId
        };
        const newHomework = await db.homework.create({ data });
        if (!newHomework) {
            throw customError('Failed to create homework', 'fail', 400, true);
        }
        return newHomework;
    }
}

/* Find all homework records for a list of termsubjectlevels */
export async function findAllHomeworksBySubjectsList(termSubjectLevelIdsArray: string[], teacherId: string) {
    // const subjectIds = subjectIdsArray;
    const numerictermSubjectLevelIds = termSubjectLevelIdsArray.map(Number);

    const homeworks = await db.homework.findMany({
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

    return homeworks;
}

/* Find all homework records for a termsubjectlevelid and sectionid */
export async function findAllHomeworkByTermAndSection(termSubjectLevelId: string, sectionId: string, teacherId: string) {
    const homeworks = await db.homework.findMany({
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
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return homeworks;
}

/* Get a homework record by its ID */
export async function findHomeworkById(homeworkId: string) {
    const homework = await db.homework.findUnique({
        where: { id: +homeworkId },
        include: {
            subject: true, // Always include related subject details
            teacher: {
                select: {
                    id: true,
                    teacherPersonalDetails: {
                        select: {
                            firstName: true,
                            lastName: true
                        }
                    }
                },
                where: {
                    id: +homeworkId,
                    role: 'TEACHER'
                }
            },
            admin: {
                select: {
                    id: true,
                    adminPersonalDetails: {
                        select: {
                            firstName: true,
                            lastName: true
                        }
                    }
                },
                where: {
                    id: +homeworkId,
                    role: 'ADMIN'
                }
            }
        }
    });

    if (!homework) {
        throw customError('Homework not found', 'not_found', 404, true);
    }

    return homework;
}
