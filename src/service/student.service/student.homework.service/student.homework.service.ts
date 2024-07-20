import { db } from '../../../utils/db.server';

export async function fetchStudentHomework(studentId: number, termSubjectLevelId: number, sectionId: number) {
    const currentTerm = await db.term.findFirst({
        where: { currentTerm: true },
        select: { startDate: true }
    });

    if (!currentTerm) {
        throw new Error('No current term found');
    }

    const startDate = currentTerm.startDate;
    const studentCourseDetails = await db.student.findUnique({
        where: {
            id: studentId
        },
        include: {
            studentHomework: {
                where: {
                    homework: {
                        termSubjectLevelId: termSubjectLevelId,
                        sectionId: sectionId,
                        createdAt: {
                            gte: startDate
                        }
                    },
                    createdAt: {
                        gte: startDate
                    }
                },
                include: {
                    homework: true
                }
            },
            studentClasswork: {
                where: {
                    classwork: {
                        termSubjectLevelId: termSubjectLevelId,
                        sectionId: sectionId,
                        createdAt: {
                            gte: startDate
                        }
                    },
                    createdAt: {
                        gte: startDate
                    }
                },
                include: {
                    classwork: true
                }
            },
            feedback: {
                where: {
                    termSubjectLevelId: termSubjectLevelId,
                    sectionId: sectionId,
                    createdAt: {
                        gt: startDate
                    }
                }
            }
        }
    });
    const specificDate = new Date('2024-05-25T00:00:00Z');
    const allAutomatedEmails = await db.automatedMailForParents.findMany({
        where: {
            studentId,
            sendDate: {
                gt: specificDate
            }
        }
    });
    const schoolCA = await db.schoolCheckInAttendance.findMany({
        where: {
            studentId,
            date: {
                gt: startDate
            }
        },
        select: {
            date: true,
            classAttendance: {
                where: {
                    studentClassAssignment: {
                        termSubjectLevelId,
                        sectionId
                    }
                },
                select: {
                    date: true,
                    attendanceStatus: true
                }
            }
        }
    });

    return { studentCourseDetails, allAutomatedEmails, schoolCA };
}
export async function fetchStudentReport(studentId: number) {
    const currentTerm = await db.term.findFirst({
        where: { currentTerm: true },
        select: { startDate: true }
    });

    if (!currentTerm) {
        throw new Error('No current term found');
    }

    const startDate = currentTerm.startDate;
    const studentCourseDetails = await db.student.findUnique({
        where: {
            id: studentId
        },
        include: {
            studentHomework: {
                where: {
                    homework: {
                        createdAt: {
                            gte: startDate
                        }
                    },
                    createdAt: {
                        gte: startDate
                    }
                },
                include: {
                    homework: true
                }
            },
            studentClasswork: {
                where: {
                    classwork: {
                        createdAt: {
                            gte: startDate
                        }
                    },
                    createdAt: {
                        gte: startDate
                    }
                },
                include: {
                    classwork: true
                }
            },
            feedback: {
                where: {
                    createdAt: {
                        gte: startDate
                    }
                }
            }
        }
    });
    const specificDate = new Date('2024-05-25T00:00:00Z');
    const allAutomatedEmails = await db.automatedMailForParents.findMany({
        where: {
            studentId,
            sendDate: {
                gt: specificDate
            }
        }
    });
    const schoolCA = await db.schoolCheckInAttendance.findMany({
        where: {
            studentId,
            date: {
                gt: startDate
            }
        },
        include: {
            classAttendance: {
                include: {
                    studentClassAssignment: true
                },
                where: {
                    date: {
                        gte: startDate
                    }
                }
            }
        }
    });

    return { studentCourseDetails, allAutomatedEmails, schoolCA };
}
