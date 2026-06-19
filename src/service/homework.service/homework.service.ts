import { db } from '../../utils/db.server';
import { customError } from '../../utils/customError';
import { getHomeWorkDownloadPresignedUrl } from '../aws.service/aws.homework.fileDownload.service/aws.homework.fileDownload.service';

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
    const termSubjectLevel = await db.termSubjectLevel.findUnique({
        where: { id: +termSubjectLevelId },
        include: {
            subject: {
                select: {
                    id: true
                }
            }
        }
    });

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
            subjectId: termSubjectLevel?.subject.id as number,
            sectionId: +sectionId,
            termSubjectLevelId: +termSubjectLevelId,
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
            subjectId: termSubjectLevel?.subject.id as number,
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

/* Find all homework records for a list of termsubjectlevels not used*/
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

/* Find all homework records for a termsubjectlevelid and sectionid (admin: no teacher filter) */
export async function findAllHomeworkByTermAndSectionForAdmin(termSubjectLevelId: string, sectionId: string, date?: string) {
    const base = date ? new Date(date) : new Date();
    const day = isNaN(base.getTime()) ? new Date() : base;

    const startDate = new Date(day);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(day);
    endDate.setHours(23, 59, 59, 999);
    const homeworks = await db.homework.findMany({
        where: {
            termSubjectLevelId: +termSubjectLevelId,
            sectionId: +sectionId,
            createdAt: {
                gte: startDate,
                lte: endDate
            }
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

/* Find all homework records for a termsubjectlevelid and sectionid — no date restriction */
export async function findAllHomeworkByTermAndSection(termSubjectLevelId: string, sectionId: string, teacherId: string) {
    const homeworks = await db.homework.findMany({
        where: {
            termSubjectLevelId: +termSubjectLevelId,
            sectionId: +sectionId,
            teacherId: +teacherId,
            // Date restriction removed: admin must be able to view/edit/delete
            // homework from any date (past, current, future).
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
export async function findAllAssignedHomeworkByTermAndSection(termSubjectLevelId: string, sectionId: string, _teacherId: string) {
    const homeworks = await db.homework.findMany({
        where: {
            termSubjectLevelId: +termSubjectLevelId,
            sectionId: +sectionId,
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

    // Preserve the original subjectId — do not overwrite it with a hardcoded value.
    const existingHomework = await db.homework.findUnique({ where: { id: +homeworkId } });
    if (!existingHomework) {
        throw customError('Homework not found', 'fail', 404, true);
    }
    const subjectId = existingHomework.subjectId;

    // Prepare data for updating
    let data;
    if (uploadedUserRole === 'TEACHER') {
        data = {
            subjectId,
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
            subjectId,
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
    const groupHomeworkEntries = await db.groupHomework.findMany({
        where: {
            HomeworkSnapshot: {
                some: {
                    homeworkId: +homeworkId
                }
            },
            isSent: false
        },
        include: {
            HomeworkSnapshot: {
                where: {
                    homeworkId: +homeworkId
                }
            }
        }
    });
    // console.log(
    //     'groupHomeworkEntries',
    //     groupHomeworkEntries.map((g) => g.HomeworkSnapshot),
    //     homeworkId
    // );
    const presignedAttachments = [];
    const presignedFileNames = [];
    for (const attachment of attachments) {
        try {
            const { downloadUrl } = await getHomeWorkDownloadPresignedUrl(attachment);
            presignedAttachments.push(downloadUrl);
            presignedFileNames.push(extractFileName(attachment));
        } catch (error) {
            // Handle error (e.g., log it or throw a custom error)
            console.error('Error generating presigned URL:', error);
            throw customError('Failed to generate presigned URL', 'fail', 500, true);
        }
    }
    for (const groupHomework of groupHomeworkEntries) {
        await db.groupHomework.update({
            where: { id: groupHomework.id },
            data: {
                title,
                description: [description],
                attachments,
                updatedAt: new Date()
            }
        });

        for (const snapshot of groupHomework.HomeworkSnapshot) {
            await db.homeworkSnapshot.update({
                where: { id: snapshot.id },
                data: {
                    description,
                    attachments: presignedAttachments,
                    fileNames: presignedFileNames,
                    updatedAt: new Date()
                }
            });
        }
    }
    // console.log('presignedAttachments', presignedAttachments);
    return updatedHomework;
}

/*delete homework*/
export async function deleteHomework(homeworkId: string) {
    const groupHomeworkEntries = await db.groupHomework.findMany({
        where: {
            HomeworkSnapshot: {
                some: {
                    homeworkId: +homeworkId
                }
            },
            isSent: false
        },
        include: {
            HomeworkSnapshot: {
                where: {
                    homeworkId: +homeworkId
                }
            }
        }
    });
    // Delete each found HomeworkSnapshot entry
    for (const groupHomework of groupHomeworkEntries) {
        for (const snapshot of groupHomework.HomeworkSnapshot) {
            await db.homeworkSnapshot.delete({ where: { id: snapshot.id } });
        }
    }
    const deletedHomework = await db.homework.delete({
        where: { id: +homeworkId }
    });
    // Delete GroupHomework entries if they have no remaining HomeworkSnapshots
    for (const groupHomework of groupHomeworkEntries) {
        const remainingSnapshots = await db.homeworkSnapshot.count({
            where: { groupHomeworkId: groupHomework.id }
        });

        if (remainingSnapshots === 0) {
            await db.groupHomework.delete({ where: { id: groupHomework.id } });
        }
    }
    if (!deletedHomework) {
        throw customError('Error deleting homework', 'fail', 400, true);
    }
    return deletedHomework;
}

// Utility function to extract file name from the URL
function extractFileName(url: string) {
    const originalName = url?.split('/').pop();
    if (!originalName) return 'No file name';
    const lastHyphenIndex = originalName.lastIndexOf('-');
    if (lastHyphenIndex !== -1) {
        // Extract the name including the extension
        const nameWithExtension = originalName.substring(0, lastHyphenIndex);
        // Find the last dot to isolate the extension
        const lastDotIndex = nameWithExtension.lastIndexOf('.');
        if (lastDotIndex !== -1) {
            // Return only the name, excluding the extension
            return nameWithExtension.substring(0, lastDotIndex);
        }
        return nameWithExtension; // Return the full name if there is no dot
    }
    // If there is no hyphen, find the dot and return the substring before it
    const lastDotIndex = originalName.lastIndexOf('.');
    if (lastDotIndex !== -1) {
        return originalName.substring(0, lastDotIndex);
    }
    return originalName; // Default case if no hyphen and no dot found
}
