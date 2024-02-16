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

    if (!homework) {
        throw customError('Homework not found', 'not_found', 404, true);
    }

    return homework;
}
/*edit homework*/
export async function editHomework(
    homeworkId: string,
    termSubjectLevelId: string,
    sectionId: string,
    uploaderId: string,
    uploadedUserRole: string,
    title: string,
    description: string,
    attachments: string[]
) {
    // Check for uploader role and existence
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

    // Prepare data for updating
    let data;
    if (uploadedUserRole === 'TEACHER') {
        data = {
            subjectId: 1,
            sectionId: +sectionId,
            teacherId: +uploaderId,
            adminId: null,
            uploadedUserRole,
            title,
            description,
            attachments,
            updatedAt: new Date(),
            termSubjectLevelId: +termSubjectLevelId
        };
    } else if (uploadedUserRole === 'ADMIN') {
        data = {
            subjectId: 1,
            sectionId: +sectionId,
            teacherId: null,
            adminId: +uploaderId,
            uploadedUserRole,
            title,
            description,
            attachments,
            updatedAt: new Date(),
            termSubjectLevelId: +termSubjectLevelId
        };
    } else {
        throw customError('Invalid role', 'fail', 400, true);
    }

    // Update the homework in the database
    const updatedHomework = await db.homework.update({ where: { id: +homeworkId }, data });
    if (!updatedHomework) {
        throw customError('Failed to update homework', 'fail', 400, true);
    }

    return updatedHomework;
}
// export async function updateHomework(
//     homeworkId: string,
//     termSubjectLevelId: string,
//     sectionId: string,
//     uploaderId: string,
//     uploadedUserRole: string,
//     title: string,
//     description: string,
//     attachments: string[]
// ) {
//     // Check for uploader role and existence
//     let teacherId = null;
//     let adminId = null;

//     if (uploadedUserRole === 'TEACHER') {
//         const uploader = await db.teacher.findUnique({ where: { id: +uploaderId } });
//         if (!uploader) throw customError('Teacher not found', 'fail', 404, true);
//         teacherId = +uploaderId;
//     } else if (uploadedUserRole === 'ADMIN') {
//         const uploader = await db.admin.findUnique({ where: { id: +uploaderId } });
//         if (!uploader) throw customError('Admin not found', 'fail', 404, true);
//         adminId = +uploaderId;
//     } else {
//         throw customError('Invalid role', 'fail', 400, true);
//     }

//     // Prepare data for updating
//     const data = {
//         subjectId: 1,
//         sectionId: +sectionId,
//         teacherId, // null if not a teacher
//         adminId, // null if not an admin
//         uploadedUserRole,
//         title,
//         description,
//         attachments,
//         updatedAt: new Date(),
//         termSubjectLevelId: +termSubjectLevelId
//     };

//     // Update the homework in the database
//     const updatedHomework = await db.homework.update({
//         where: { id: +homeworkId },
//         data
//     });

//     if (!updatedHomework) {
//         throw customError('Failed to update homework', 'fail', 400, true);
//     }

//     return updatedHomework;
// }

/*delete homework*/
export async function deleteHomework(homeworkId: string) {
    const deletedHomework = await db.homework.delete({
        where: { id: +homeworkId }
    });

    if (!deletedHomework) {
        throw customError('Error deleting homework', 'fail', 400, true);
    }
    return deletedHomework;
}
