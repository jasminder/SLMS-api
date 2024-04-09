import { customError } from '../../../utils/customError';
import { db } from '../../../utils/db.server';

/*find teacher by ID*/
export async function findTeacherByIdForTeacher(id: string) {
    const teacher = await db.teacher.findUnique({
        where: {
            id: +id,
            role: 'TEACHER',
            isActive: true
        },
        select: {
            id: true,
            role: true,
            createdAt: true,
            teacherPersonalDetails: {
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

            teacherEmergencyContact: {
                select: {
                    id: true,
                    contactPerson: true,
                    contactNumber: true,
                    relationship: true
                }
            },
            teacherWWCHealthInformation: {
                select: {
                    id: true,
                    medicareNumber: true,
                    medicalCondition: true,
                    childrenCheckCardNumber: true,
                    workingwithChildrenCheckCardPhotoImage: true,
                    workingWithChildrenCheckExpiry: true
                }
            },
            teacherWorkRights: {
                select: {
                    immigrationStatus: true,
                    workRights: true
                }
            },
            teacherQualificationAvailability: {
                select: {
                    experience: true,
                    qualification: true,
                    subjectsChosen: true,
                    timeSlotsChosen: true
                }
            },
            teacherBankDetails: {
                select: {
                    ABN: true,
                    accountNumber: true,
                    bankAccountName: true,
                    BSB: true
                }
            },
            teacherOtherInformation: {
                select: {
                    id: true,
                    otherInfo: true
                }
            }
        }
    });

    return teacher;
}
// find current term for teachers
export const findCurrentTermForTeacher = async () => {
    const currentTerm = await db.term.findFirst({
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
                    level: true,
                    termSubjectGroup: true
                }
            },
            termSubjectLevel: {
                include: {
                    sections: {
                        select: { name: true }
                    },
                    level: { select: { name: true } },
                    subject: { select: { name: true } }
                }
            }
        }
    });

    if (!currentTerm) {
        throw customError(`Current Term could not found. Please try again later`, 'fail', 404, true);
    }

    return currentTerm;
};

// find subjects assigned to teachers
export async function findSubjectsAssignedForTeacher(id: string) {
    const assignedSubjects = await db.teacherSubject.findMany({
        where: {
            teacherId: +id
        },
        include: {
            subject: true
        }
    });

    // Mapping to get only necessary details, if needed
    // return assignedSubjects;
    return assignedSubjects.map((assignment) => ({
        name: assignment.subject.name,
        isActive: assignment.subject.isActive
    }));
}
/*get all classes for teachers*/
export const findAllClassesAssignedForTeacher = async (teacherId: string) => {
    const assignedClasses = await db.teacherClassAssignment.findMany({
        where: {
            teacherId: parseInt(teacherId),
            termSubjectLevel: {
                term: {
                    currentTerm: true
                }
            }
        },
        include: {
            termSubjectLevel: {
                include: {
                    subject: {
                        include: {
                            termSubject: {
                                where: {
                                    term: {
                                        currentTerm: true
                                    }
                                },
                                select: {
                                    isOnSunday: true,
                                    isOnWeekday: true
                                }
                            }
                        }
                    },
                    level: true,
                    term: true
                }
            },
            section: true
        }
    });
    console.log(assignedClasses);
    return assignedClasses;
};
// find students in the same class
export async function fetchStudentsInSameClass(termSubjectLevelId: string, sectionName: string) {
    const numericTermSubjectLevelId = parseInt(termSubjectLevelId);

    const classAssignments = await db.studentClassAssignment.findMany({
        where: {
            termSubjectLevelId: numericTermSubjectLevelId,
            section: {
                name: sectionName
            },
            isCurrentlyAssigned: true,
            student: {
                isActive: true,
                role: 'STUDENT'
            }
        },
        include: {
            student: {
                include: {
                    personalDetails: true
                }
            }, // Include additional student details as needed
            section: true
        }
    });

    return classAssignments;
}
