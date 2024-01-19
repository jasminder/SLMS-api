import { db } from '../../utils/db.server';
import { customError } from '../../utils/customError';

/* Create a new homework record */
export async function createHomework(subjectId: string, uploaderId: string, uploadedUserRole: string, title: string, description: string, attachments: string[]) {
    const subject = await db.subject.findUnique({ where: { id: +subjectId } });
    if (!subject) {
        throw customError('Subject not found', 'fail', 404, true);
    }
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
            subjectId: +subjectId,
            teacherId: +uploaderId,
            adminId: null,
            uploadedUserRole,
            title,
            description,
            attachments,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const newHomework = await db.homework.create({ data });
        if (!newHomework) {
            throw customError('Failed to create homework', 'fail', 400, true);
        }

        return newHomework;
    } else if (uploadedUserRole === 'ADMIN') {
        const data = {
            subjectId: +subjectId,
            teacherId: null,
            adminId: +uploaderId,
            uploadedUserRole,
            title,
            description,
            attachments,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const newHomework = await db.homework.create({ data });
        if (!newHomework) {
            throw customError('Failed to create homework', 'fail', 400, true);
        }
        return newHomework;
    }
}

/* Find all homework records for a list of subjects */
export async function findAllHomeworksBySubjectsList(subjectIdsArray: string[]) {
    // const subjectIds = subjectIdsArray;
    const numericSubjectIds = subjectIdsArray.map(Number);

    const homeworks = await db.homework.findMany({
        where: {
            subjectId: {
                in: numericSubjectIds
            }
        },
        include: {
            subject: true,
            teacher: true
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

/* Update homework record by adding a new attachment */
export async function addAttachmentToHomework(homeworkId: number, newAttachment: string) {
    // Retrieve the current homework record
    const currentHomework = await db.homework.findUnique({
        where: { id: homeworkId },
        select: { attachments: true }
    });

    if (!currentHomework) {
        throw new Error('Homework not found');
    }

    // Add the new attachment to the existing array
    const updatedAttachments = [...currentHomework.attachments, newAttachment];

    // Update the homework record with the new attachments array
    const updatedHomework = await db.homework.update({
        where: { id: homeworkId },
        data: {
            attachments: updatedAttachments,
            updatedAt: new Date() // Update the timestamp
        }
    });
    if (updatedHomework) {
        throw customError('Failed to update homework attachment', 'fail', 400, true);
    }

    return updatedHomework;
}
