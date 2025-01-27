import { promise } from 'zod';
import { ChangeCurrentTermNameSchema, CreateNewTermSetupSchema, ExtendCurrentTermSchema, FindUniqueTermSchema } from '../../../schema/admin.dto/admin.administration.dto/admin.administration.dto';
import { customError } from '../../../utils/customError';
import { db } from '../../../utils/db.server';
import { startOfDay, endOfDay } from 'date-fns';
import { sendEmail } from '../../../utils/email';

/* ORGANISTAION SET UP*/

export const createNewTermSetup = async (setupData: CreateNewTermSetupSchema['body']) => {
    const { termName, startDate, endDate, groupSubjects } = setupData;

    const sDate = new Date(startDate);
    sDate.setHours(0, 0, 0, 0);
    const eDate = new Date(endDate);
    eDate.setHours(23, 59, 59, 999);

    const transactionResult = await db.$transaction(async () => {
        // Check and create term
        const existingTerm = await db.term.findFirst({
            where: { name: termName.toLowerCase() }
        });

        if (existingTerm) {
            throw customError(`Term with name ${termName} already exists.`, 'fail', 404, true);
        }

        const createdTerm = await db.term.create({
            data: {
                name: termName.toLowerCase(),
                startDate: sDate,
                endDate: eDate
            },
            select: {
                id: true,
                currentTerm: true,
                isPublish: true,
                name: true
            }
        });

        for (const group of groupSubjects) {
            // Find or create subject group
            let subjectGroup = await db.subjectGroup.findUnique({
                where: { groupName: group.groupName.toLowerCase() }
            });
            if (!subjectGroup) {
                subjectGroup = await db.subjectGroup.create({
                    data: { groupName: group.groupName.toLowerCase() }
                });
            }

            // Find or create fee for the subject group
            let fee = await db.fee.findFirst({
                where: {
                    amount: parseInt(group.fee),
                    paymentType: group.feeInterval === 'MONTHLY' ? 'MONTHLY' : 'TERM'
                }
            });
            if (!fee) {
                fee = await db.fee.create({
                    data: {
                        amount: parseInt(group.fee),
                        paymentType: group.feeInterval === 'MONTHLY' ? 'MONTHLY' : 'TERM'
                    }
                });
            }

            // Create TermSubjectGroup
            const termSubjectGroup = await db.termSubjectGroup.create({
                data: {
                    termId: createdTerm.id,
                    subjectGroupId: subjectGroup.id,
                    feeId: fee.id,
                    subject: {
                        connectOrCreate: group.subjects.map((sub) => ({
                            where: { name: sub.subjectName.toLowerCase() },
                            create: {
                                name: sub.subjectName.toLowerCase()
                            }
                        }))
                    }
                }
            });

            for (const subjectData of group.subjects) {
                // Find or create subject
                let subject = await db.subject.findUnique({
                    where: { name: subjectData.subjectName.toLowerCase() }
                });
                if (!subject) {
                    subject = await db.subject.create({
                        data: { name: subjectData.subjectName.toLowerCase() }
                    });
                }

                // Create TermSubjectGroupSubject
                await db.termSubjectGroupSubject.create({
                    data: {
                        termId: createdTerm.id,
                        subjectGroupId: subjectGroup.id,
                        termSubjectGroupId: termSubjectGroup.id,
                        subjectId: subject.id
                    }
                });

                // Create TermSubject with levels
                await db.termSubject.create({
                    data: {
                        termSubjectGroupId: termSubjectGroup.id,
                        subjectId: subject.id,
                        termId: createdTerm.id,
                        level: {
                            connectOrCreate: subjectData.levels.map((levelName) => ({
                                where: { name: levelName },
                                create: { name: levelName }
                            }))
                        }
                    }
                });
            }
        }

        return createdTerm;
    });

    return transactionResult;
};

export async function findAllTerm() {
    const allTerms = await db.term.findMany({
        select: {
            id: true,
            name: true,
            currentTerm: true,
            isPublish: true,
            automatedAttendanceEnabled: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            updatedAt: true,
            termSubject: {
                select: {
                    id: true,
                    level: true,
                    subject: true,
                    isOnSunday: true,
                    isOnWeekday: true
                }
            },
            termSubjectGroup: {
                select: {
                    subjectGroup: {
                        select: {
                            groupName: true
                        }
                    },
                    fee: {
                        select: {
                            amount: true,
                            paymentType: true
                        }
                    },
                    subject: {
                        select: {
                            id: true,
                            name: true,
                            isActive: true
                        }
                    }
                }
            },
            studentTermFee: {
                include: {
                    student: {
                        select: {
                            id: true,
                            role: true,
                            isActive: true
                        }
                    }
                }
            }
        },
        orderBy: {
            currentTerm: 'desc'
        }
    });

    return allTerms;
}

// find a unique term
export async function findUniqueTerm(id: FindUniqueTermSchema['params']['id']) {
    const uniqueTerm = await db.term.findUnique({
        where: {
            id: +id // Ensure id is a number
        },
        select: {
            id: true,
            name: true,
            isPublish: true,
            currentTerm: true,
            automatedAttendanceEnabled: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            updatedAt: true,
            termSubject: {
                select: {
                    id: true,
                    subject: true,
                    level: true,
                    isOnSunday: true,
                    isOnWeekday: true
                }
            },
            termSubjectGroup: {
                select: {
                    id: true,
                    fee: true,
                    subjectGroup: true
                }
            },
            studentTermFee: {
                include: {
                    student: {
                        select: {
                            id: true,
                            role: true,
                            isActive: true
                        }
                    }
                }
            }
        }
    });

    if (!uniqueTerm) {
        throw customError(`Term with ID ${id} could not be found. Please try again later.`, 'fail', 404, true);
    }

    return uniqueTerm;
}
export async function findTermForSetup(id: FindUniqueTermSchema['params']['id']) {
    const uniqueTerm = await db.term.findFirst({
        where: {
            id: +id // Ensure id is a number
        },
        select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            termSubjectGroup: {
                include: {
                    fee: true,
                    subjectGroup: true,
                    termSubject: {
                        include: {
                            subject: true,
                            level: true
                        }
                    }
                }
            }
        }
    });

    if (!uniqueTerm) {
        throw customError(`Term with ID ${id} could not be found. Please try again later.`, 'fail', 404, true);
    }

    return uniqueTerm;
}

// extend current term

export async function extendCurrentTerm(id: ExtendCurrentTermSchema['params']['id'], termData: ExtendCurrentTermSchema['body']['updatedTerm']) {
    const eDate = new Date(termData.endDate);
    const currentTerm = await db.term.findUnique({
        where: {
            id: +id
        }
    });

    if (!currentTerm) {
        throw customError(`Term with ID ${id} does not exist.`, 'fail', 404, true);
    }
    if (!currentTerm.currentTerm) {
        throw customError(`Term with ID ${id} already expired.`, 'fail', 404, true);
    }
    const startDate = new Date(currentTerm.startDate);
    if (eDate <= startDate) {
        throw customError(`The new end date must be later than the start date (${currentTerm.startDate}).`, 'fail', 404, true);
    }
    eDate.setHours(23, 59, 59, 999); // Set to one second before midnight on the day before the term ends

    const updatedTerm = await db.term.update({
        where: {
            id: +id
        },
        data: {
            endDate: eDate,
            currentTerm: true // Update only if needed based on your logic
        },
        select: {
            id: true,
            name: true,
            currentTerm: true,
            isPublish: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            updatedAt: true,
            termSubject: {
                select: {
                    id: true,
                    level: true,
                    subject: true
                }
            },
            termSubjectGroup: {
                select: {
                    subjectGroup: {
                        select: {
                            groupName: true
                        }
                    },
                    fee: {
                        select: {
                            amount: true,
                            paymentType: true
                        }
                    },
                    subject: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            }
        }
    });

    return updatedTerm;
}
// end term
export async function endCurrentTerm(id: FindUniqueTermSchema['params']['id']) {
    const currentDate = new Date(); // Current date
    const currentTerm = await db.term.findUnique({
        where: {
            id: +id
        }
    });
    if (!currentTerm) {
        throw customError(`Term not found or could not be updated. Please try again later`, 'fail', 404, true);
    }
    if (!currentTerm?.currentTerm) {
        throw customError(`This term already expired'`, 'fail', 404, true);
    }

    const updatedTerm = await db.term.update({
        where: {
            id: +id // or use name if you're updating by term name
        },
        data: {
            endDate: currentDate, // Setting the end date to now
            currentTerm: false
        }
    });

    return updatedTerm;
}

export async function makePublishTerm(id: FindUniqueTermSchema['params']['id']) {
    return db.$transaction(async () => {
        await db.term.updateMany({
            data: {
                isPublish: false
            }
        });
        const currentTerm = await db.term.findUnique({
            where: {
                id: +id
            }
        });
        if (!currentTerm) {
            throw customError(`Term not found or could not be updated. Please try again later`, 'fail', 404, true);
        }
        if (currentTerm.endDate < new Date()) {
            throw customError(`Term cannot be publlished , if it is expired. Please try again later`, 'fail', 404, true);
        }
        const updatedTerm = await db.term.update({
            where: {
                id: +id // or use name if you're updating by term name
            },
            data: {
                isPublish: true
            }
        });
        return updatedTerm;
    });
}
export async function unPublishTerm(id: FindUniqueTermSchema['params']['id']) {
    return db.$transaction(async () => {
        const currentTerm = await db.term.findUnique({
            where: {
                id: +id
            }
        });
        if (!currentTerm) {
            throw customError(`Term not found or could not be updated. Please try again later`, 'fail', 404, true);
        }
        const updatedTerm = await db.term.update({
            where: {
                id: +id // or use name if you're updating by term name
            },
            data: {
                isPublish: false
            }
        });
        return updatedTerm;
    });
}

export async function makeCurrentTerm(id: FindUniqueTermSchema['params']['id']) {
    let emailTasks: { email: string; subject: string; text: string }[] = [];

    // Start a transaction
    const updatedTerm = await db.$transaction(async (prisma) => {
        // Find the currently active term
        const currentTerm = await prisma.term.findFirst({
            where: {
                currentTerm: true
            }
        });
        const currentTermBeforeChange = currentTerm;
        if (!currentTermBeforeChange) {
            throw customError(`No current term found`, 'fail', 404, true);
        }
        // If there is a current term, deactivate the associated timetables
        if (currentTerm) {
            await prisma.timeTable.updateMany({
                where: {
                    isActive: true,
                    termId: currentTerm.id
                },
                data: {
                    isActive: false
                }
            });
            await prisma.timetable.updateMany({
                where: {
                    isActive: true
                },
                data: {
                    isActive: false
                }
            });
        }

        // Set all terms to not be the current term
        await prisma.term.updateMany({
            data: {
                currentTerm: false,
                automatedAttendanceEnabled: false
            }
        });

        const lastActiveStudent = await prisma.student.findFirst({
            where: { isActive: true, role: 'STUDENT' },
            orderBy: { akaalId: 'desc' }
        });
        let nextAkaalId = lastActiveStudent ? (lastActiveStudent.akaalId ?? 0) + 1 : 1;

        // Find the term to be set as the current term
        const newCurrentTerm = await prisma.term.findUnique({
            where: {
                id: +id
            }
        });

        if (!newCurrentTerm) {
            throw customError(`Term not found or could not be updated. Please try again later`, 'fail', 404, true);
        }

        // Update the term to be the current term
        const updatedTerm = await prisma.term.update({
            where: {
                id: +id
            },
            data: {
                currentTerm: true
            }
        });

        // Retrieve IDs of students to update
        const studentsToUpdate = await prisma.student.findMany({
            where: {
                role: 'STUDENT',
                isActive: false
            },
            select: { id: true, akaalId: true }
        });

        //delete all student notice acknowledgement
        await prisma.studentNoticeAcknowledgement.deleteMany();

        // Then delete all StudentNotice records
        await prisma.studentNotice.deleteMany();
        const studentsToUpdateAttendance = await prisma.student.findMany({
            where: {
                role: 'STUDENT',
                isActive: true
            },
            select: { id: true, termAttendance: true, previousTermAttendance: true }
        });

        const template = await prisma.enrollmentConfirmationEmailTemplate.findFirst({
            orderBy: { createdAt: 'desc' }
        });

        if (!template) {
            console.log('No enrollment confirmation email template found');
        }

        const batchSize = 100; // Adjust the batch size as needed
        for (let i = 0; i < studentsToUpdate.length; i += batchSize) {
            const batch = studentsToUpdate.slice(i, i + batchSize);
            const updates = batch.map(async (student) => {
                let updateData: any = { isActive: true };
                if (!student.akaalId) {
                    // Only assign a new akaalId if it's null
                    updateData.akaalId = nextAkaalId++;
                }
                const updatedStudent = await prisma.student.update({
                    where: { id: student.id, isActive: false, role: 'STUDENT' },
                    data: { ...updateData },
                    include: { personalDetails: true } // Include personal details to get the email
                });

                // Collect email tasks instead of sending immediately
                if (updatedStudent.personalDetails?.email && template) {
                    emailTasks.push({
                        email: updatedStudent.personalDetails.email,
                        subject: template.subject,
                        text: template.text
                    });
                }

                return updatedStudent;
            });
            await Promise.all(updates);
        }

        for (let i = 0; i < studentsToUpdateAttendance.length; i += batchSize) {
            const batch = studentsToUpdateAttendance.slice(i, i + batchSize);
            const updates = batch.map((student) =>
                db.$transaction([
                    db.studentTermAttendanceHistory.upsert({
                        where: {
                            studentId_termId: {
                                studentId: student.id,
                                termId: currentTermBeforeChange.id
                            }
                        },
                        create: {
                            studentId: student.id,
                            termId: currentTermBeforeChange.id,
                            termName: currentTermBeforeChange.name,
                            termAttendance: student.termAttendance
                        },
                        update: {
                            termAttendance: student.termAttendance
                        }
                    }),
                    prisma.student.update({
                        where: {
                            id: student.id
                        },
                        data: {
                            termAttendance: 0,
                            attendancePercentageValue: 0
                        }
                    })
                ])
            );
            await Promise.all(updates);
        }

        for (let i = 0; i < studentsToUpdateAttendance.length; i += batchSize) {
            const batch = studentsToUpdateAttendance.slice(i, i + batchSize);
            const updates = batch.map((student) =>
                prisma.student.update({
                    where: {
                        id: student.id
                    },
                    data: {
                        previousTermAttendance: student.termAttendance,
                        termAttendance: 0,
                        attendancePercentageValue: 0
                    }
                })
            );
            await Promise.all(updates);
        }

        return updatedTerm;
    });

    // After successful transaction, send all emails
    if (emailTasks.length > 0) {
        for (const task of emailTasks) {
            try {
                await sendEmail(task);
            } catch (error) {
                console.error(`Failed to send email to ${task.email}:`, error);
                // You might want to implement a retry mechanism or log this for manual follow-up
            }
        }
    } else {
        console.log('No enrollment confirmation emails to send.');
    }

    return updatedTerm;
}
// change Current Term Name
export async function changeCurrentTermName(id: ChangeCurrentTermNameSchema['params']['id'], termData: ChangeCurrentTermNameSchema['body']['updatedTerm']) {
    const { name } = termData;

    // Check if a term with the new name already exists
    const existingTermWithGivenName = await db.term.findFirst({
        where: {
            name: {
                equals: name,
                mode: 'insensitive'
            }
        }
    });

    if (existingTermWithGivenName?.name) {
        throw customError(`This term name - ${name} already exists for a term`, 'fail', 404, true);
    }

    // Fetch the current term
    const currentTerm = await db.term.findUnique({
        where: {
            id: +id
        }
    });

    if (!currentTerm) {
        throw customError(`Term not found or could not be updated. Please try again later`, 'fail', 404, true);
    }

    // Update the term name
    const updatedTerm = await db.term.update({
        where: {
            id: +id
        },
        data: {
            name
        },
        select: {
            id: true,
            name: true,
            currentTerm: true,
            isPublish: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            updatedAt: true,
            termSubject: {
                select: {
                    id: true,
                    level: true,
                    subject: true
                }
            },
            termSubjectGroup: {
                select: {
                    subjectGroup: {
                        select: {
                            groupName: true
                        }
                    },
                    fee: {
                        select: {
                            amount: true,
                            paymentType: true
                        }
                    },
                    subject: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            }
        }
    });

    return updatedTerm;
}

//delete a new term
export async function deleteTerm(id: FindUniqueTermSchema['params']['id']) {
    const termExists = await db.term.findUnique({
        where: {
            id: +id
        }
    });
    if (!termExists) {
        throw customError('Term not found or could not be deleted', 'fail', 400, true);
    }
    const deletedTerm = await db.term.delete({
        where: {
            id: +id
        }
    });

    return deletedTerm;
}

/*Create organistaion set up by cretaing subject, levels and fee*/
/* Always check if the term is active*/

/*Groups*/

export async function findAllGroups() {
    const allGroups = await db.subjectGroup.findMany({});
    if (allGroups.length == 0) throw customError('Groups lists cannot be fetched at this time', 'fail', 400, true);
    return allGroups;
}

/* Subjects */

//discontinue a subject
export async function discontinueSubject(subjectId: string) {
    const updatedSubject = await db.subject.update({
        where: { id: +subjectId },
        data: { isActive: false }
    });

    return updatedSubject;
}

// find all subjects
export async function findAllSubjects() {
    const allSubjects = await db.subject.findMany({});
    return allSubjects;
}

/*Levels */

// find all levels
export const findAllLevels = async () => {
    const allLevels = await db.level.findMany({});
    return allLevels;
};

// find students in a term
export const findAllStudentsInATerm = async (id: string, page: number) => {
    const take = 10;
    const pageNum: number = page ?? 0;
    const skip = pageNum * take;
    const studentsInTerm = await db.termSubjectGroup.findMany({
        where: { termId: +id },
        include: {
            enrollment: {
                skip,
                take,
                include: {
                    subjectEnrollment: {
                        select: {
                            termSubject: {
                                select: {
                                    subject: {
                                        select: {
                                            name: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    student: {
                        select: {
                            id: true,
                            role: true,
                            isActive: true,
                            updatedAt: true,
                            createdAt: true,
                            personalDetails: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    DOB: true,
                                    gender: true,
                                    email: true,
                                    contact: true,
                                    address: true,
                                    suburb: true,
                                    state: true,
                                    country: true,
                                    postcode: true,
                                    image: true
                                }
                            },
                            parentsDetails: {
                                select: {
                                    id: true,
                                    fatherName: true,
                                    motherName: true,
                                    parentEmail: true,
                                    parentContact: true
                                }
                            },
                            emergencyContact: {
                                select: {
                                    id: true,
                                    contactPerson: true,
                                    contactNumber: true,
                                    relationship: true
                                }
                            },
                            healthInformation: {
                                select: {
                                    id: true,
                                    medicareNumber: true,
                                    ambulanceMembershipNumber: true,
                                    medicalCondition: true,
                                    allergy: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    const uniqueStudentsMap = new Map();

    for (const termSubjectGroup of studentsInTerm) {
        for (const enrollment of termSubjectGroup.enrollment) {
            const student = enrollment.student;
            uniqueStudentsMap.set(student.id, student);
        }
    }

    const distinctStudents = Array.from(uniqueStudentsMap.values());

    return studentsInTerm;
};

// find  current term details
export async function findCurrentTerm() {
    const activeTerm = await db.term.findFirst({
        where: {
            currentTerm: true
        },
        select: {
            id: true,
            name: true,
            isPublish: true,
            currentTerm: true,
            automatedAttendanceEnabled: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            updatedAt: true,
            termSubject: {
                select: {
                    id: true,
                    subject: true,
                    level: true,
                    isOnSunday: true,
                    isOnWeekday: true
                },
                orderBy: {
                    id: 'desc'
                }
            },
            termSubjectGroup: {
                select: {
                    id: true,
                    fee: true,
                    subjectGroup: true
                }
            },
            studentTermFee: {
                select: {
                    student: {
                        select: {
                            id: true,
                            isActive: true,
                            role: true
                        }
                    }
                }
            }
        }
    });

    return activeTerm;
}
export async function findCurrentTermForeFilter() {
    const activeTerm = await db.term.findFirst({
        where: {
            currentTerm: true
        },
        select: {
            id: true,
            name: true,
            isPublish: true,
            currentTerm: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            updatedAt: true,
            termSubject: {
                select: {
                    id: true,
                    subject: true,
                    level: true
                }
            },
            termSubjectGroup: {
                select: {
                    id: true,
                    fee: true,
                    subjectGroup: true
                }
            },
            termSubjectLevel: {
                select: { level: true, sections: true, subject: true }
            }
        }
    });

    return activeTerm;
}
//find published term
export async function findPublishTermAdministration() {
    const publishTerm = await db.term.findFirst({
        where: {
            isPublish: true
        },
        select: {
            id: true,
            name: true,
            isPublish: true,
            currentTerm: true,
            automatedAttendanceEnabled: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            updatedAt: true,
            termSubject: {
                select: {
                    id: true,
                    subject: true,
                    level: true,
                    isOnSunday: true,
                    isOnWeekday: true
                }
            },
            termSubjectGroup: {
                select: {
                    id: true,
                    fee: true,
                    subjectGroup: true
                }
            },
            studentTermFee: {
                select: {
                    student: {
                        select: {
                            id: true,
                            isActive: true,
                            role: true
                        }
                    }
                }
            }
        }
    });

    return publishTerm;
}
export async function findSchoolDaysToday() {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    const schoolDaysToday = await db.schoolDay.findMany({
        where: {
            schoolOperatedDate: {
                gte: startOfToday,
                lte: endOfToday
            }
        },
        select: {
            isOnSunday: true,
            isOnWeekday: true
        }
    });

    return schoolDaysToday;
}

export async function changeIsOnSunday(termSubjectId: string, isOnSunday: boolean) {
    // Check if the term subject exists
    const termSubject = await db.termSubject.findUnique({
        where: {
            id: +termSubjectId
        }
    });

    if (!termSubject) {
        throw customError(`Term subject not found`, 'fail', 404, true);
    }

    // Update the isOnSunday field
    const updatedTermSubject = await db.termSubject.update({
        where: {
            id: +termSubjectId
        },
        data: {
            isOnSunday
        },
        select: {
            id: true,
            termId: true,
            subjectId: true,
            isOnSunday: true
            // Include any other fields you want to return
        }
    });

    return updatedTermSubject;
}

export async function changeIsOnWeekday(termSubjectId: string, isOnWeekday: boolean) {
    // Verify if the TermSubject exists
    const termSubject = await db.termSubject.findUnique({
        where: {
            id: +termSubjectId
        }
    });

    if (!termSubject) {
        throw customError(`Term subject not found`, 'fail', 404, true);
    }

    // Update the isOnWeekday field
    const updatedTermSubject = await db.termSubject.update({
        where: {
            id: +termSubjectId
        },
        data: {
            isOnWeekday
        },
        select: {
            id: true,
            termId: true,
            subjectId: true,
            isOnWeekday: true
            // You can include additional fields if needed
        }
    });

    return updatedTermSubject;
}

//helper for sending mail for confirmation on enrollment email
async function sendEnrollmentConfirmationEmail(studentEmail: string) {
    const template = await db.enrollmentConfirmationEmailTemplate.findFirst({
        orderBy: { createdAt: 'desc' }
    });

    if (!template) {
        console.log('No enrollment confirmation email template found');
        return;
    }

    await sendEmail({
        email: studentEmail,
        subject: template.subject,
        text: template.text
    });
}
