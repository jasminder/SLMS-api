import { customError } from '../../utils/customError';
import { db } from '../../utils/db.server';
import { getHomeWorkDownloadPresignedUrl } from '../aws.service/aws.homework.fileDownload.service/aws.homework.fileDownload.service';

export async function createClasswork(
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
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return classworks;
}

/* Get a classwork record by its ID */
export async function findClassworkById(classworkId: string) {
    const classwork = await db.classwork.findUnique({
        where: { id: +classworkId },
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

    if (!classwork) {
        throw customError('classwork not found', 'not_found', 404, true);
    }

    return classwork;
}
/*edit classwork*/
export async function editClasswork(
    classworkId: string,
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

    // Update the classwork in the database
    const updatedclasswork = await db.classwork.update({ where: { id: +classworkId }, data });
    if (!updatedclasswork) {
        throw customError('Failed to update classwork', 'fail', 400, true);
    }
    const groupclassworkEntries = await db.groupClasswork.findMany({
        where: {
            ClassworkSnapshot: {
                some: {
                    classworkId: +classworkId
                }
            },
            isSent: false
        },
        include: {
            ClassworkSnapshot: {
                where: {
                    classworkId: +classworkId
                }
            }
        }
    });
    console.log(
        'groupclassworkEntries',
        groupclassworkEntries.map((g) => g.ClassworkSnapshot),
        classworkId
    );
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
    for (const groupclasswork of groupclassworkEntries) {
        await db.groupClasswork.update({
            where: { id: groupclasswork.id },
            data: {
                title,
                description: [description],
                attachments,
                updatedAt: new Date()
            }
        });

        for (const snapshot of groupclasswork.ClassworkSnapshot) {
            await db.classworkSnapshot.update({
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
    console.log('presignedAttachments', presignedAttachments);
    return updatedclasswork;
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

/*delete classwork*/
export async function deleteclasswork(classworkId: string) {
    const groupclassworkEntries = await db.groupClasswork.findMany({
        where: {
            ClassworkSnapshot: {
                some: {
                    classworkId: +classworkId
                }
            }
        },
        include: {
            ClassworkSnapshot: {
                where: {
                    classworkId: +classworkId
                }
            }
        }
    });
    // Delete each found classworkSnapshot entry
    for (const groupclasswork of groupclassworkEntries) {
        for (const snapshot of groupclasswork.ClassworkSnapshot) {
            await db.classworkSnapshot.delete({ where: { id: snapshot.id } });
        }
    }
    const deletedclasswork = await db.classwork.delete({
        where: { id: +classworkId }
    });
    // Delete Groupclasswork entries if they have no remaining classworkSnapshots
    for (const groupclasswork of groupclassworkEntries) {
        const remainingSnapshots = await db.classworkSnapshot.count({
            where: { groupClassworkId: groupclasswork.id }
        });

        if (remainingSnapshots === 0) {
            await db.groupClasswork.delete({ where: { id: groupclasswork.id } });
        }
    }
    if (!deletedclasswork) {
        throw customError('Error deleting classwork', 'fail', 400, true);
    }
    return deletedclasswork;
}
