import { db } from '../../../utils/db.server';

import { SchoolDay, Student } from '@prisma/client';

export async function findAllTermSubjectsForCurrentTerm() {
    // Find the current term
    const currentTerm = await db.term.findFirst({
        where: {
            currentTerm: true
        },
        select: {
            id: true
        }
    });

    // Check if current term is found
    if (!currentTerm) {
        throw new Error('No active term found.');
    }

    // Find all term subjects for the current term
    const termSubjects = await db.termSubject.findMany({
        where: {
            termId: currentTerm.id
        },
        include: {
            subject: true,
            subjectEnrollments: true
        }
    });

    return termSubjects;
}

export async function fetchActiveStudentsForAnalytics(dateString: string) {
    const date = new Date(dateString);
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    const currentTerm = await db.term.findFirst({
        where: {
            currentTerm: true
        },
        select: {
            id: true
        }
    });
    const activeStudents = await db.student.findMany({
        where: {
            isActive: true,
            role: 'STUDENT',
            studentTermFee: {
                some: {
                    termId: currentTerm?.id
                }
            }
        }
    });
}

export async function getActiveStudentsPerSubject() {
    type ActiveStudents = Student[];
    const currentTerm = await db.term.findFirst({
        where: {
            currentTerm: true
        },
        select: {
            id: true
        }
    });

    // Check if current term is found
    if (!currentTerm) {
        throw new Error('No active term found.');
    }

    // Find all term subjects for the current term
    const termSubjects = await db.termSubject.findMany({
        where: {
            termId: currentTerm.id
        },
        include: {
            subject: true,
            subjectEnrollments: true
        }
    });

    // Find all TermSubjectLevels associated with the term
    const termSubjectLevels = await db.termSubjectLevel.findMany({
        where: { termId: currentTerm?.id },
        include: { subject: true }
    });

    let activeStudents: ActiveStudents = [];

    // Iterate over each TermSubjectLevel
    for (const termSubjectLevel of termSubjectLevels) {
        const subjectName = termSubjectLevel.subject.name;

        // Find active students for each subject
        activeStudents = await db.student.findMany({
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    every: {
                        termId: currentTerm.id
                    }
                }
            },
            include: {
                enrollments: {
                    include: {
                        subjectEnrollment: {
                            include: {
                                termSubject: {
                                    include: {
                                        subject: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    return termSubjects;
}

export async function getPresentAttendances() {
    return await db.schoolCheckInAttendance.findMany({
        where: {
            checkedIn: true,
            isMarked: true,
            SchoolDay: {
                isOnSunday: true
            }

            // classAttendance: {
            //     some: {
            //         studentClassAssignment: {
            //             termSubjectLevel: {
            //                 subject: {
            //                     termSubject: {
            //                         some: {
            //                             isOnSunday: true
            //                         }
            //                     }
            //                 }
            //             }
            //         }
            //     }
            // }
        },
        include: {
            SchoolDay: true
        }
    });
}
export async function getWeekdayPresentAttendances() {
    const attendances = await db.schoolCheckInAttendance.findMany({
        where: {
            checkedIn: true,
            SchoolDay: {
               isOnWeekday: true
            }
        },
        select: {
            date: true,
            checkedIn: true
        }
    });

    return attendances;
}

export async function getStudentsCountPerTerm() {
    const termsWithStudentCount = await db.term.findMany({
        include: {
            studentTermFee: {
                select: {
                    studentId: true
                }
            }
        }
    });
    return termsWithStudentCount.map((term) => {
        // Use a Set to store unique student IDs
        const uniqueStudentIds = new Set(term.studentTermFee.map((fee) => fee.studentId));

        return {
            termId: term.id,
            termName: term.name,
            studentCount: uniqueStudentIds.size // Count of unique student IDs
        };
    });
}

type GenderDistribution = {
    [key: string]: number;
};

export async function getGenderDistributionForCurrentTerm(): Promise<GenderDistribution> {
    // Retrieve the current term
    const currentTerm = await db.term.findFirst({
        where: { currentTerm: true }
    });

    if (!currentTerm) {
        throw new Error('Current term not found');
    }

    // Count students by gender who are active and enrolled in the current term
    const genderCounts = await db.personalDetails.groupBy({
        by: ['gender'],
        _count: {
            gender: true
        },
        where: {
            student: {
                isActive: true,
                studentTermFee: {
                    some: {
                        termId: currentTerm.id
                    }
                }
            }
        }
    });

    // Transform the result into a more readable format and consolidate gender cases
    const genderDistribution: GenderDistribution = {};
    genderCounts.forEach((count) => {
        const genderKey = count.gender ? count.gender.toLowerCase() : 'unknown'; // Normalize to lower case
        genderDistribution[genderKey] = (genderDistribution[genderKey] || 0) + count._count.gender;
    });

    return genderDistribution;
}
