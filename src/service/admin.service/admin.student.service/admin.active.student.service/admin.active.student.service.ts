import { db } from '../../../../utils/db.server';
import { customError } from '../../../../utils/customError';
import { ActiveStudentEnrollDataSchema } from '../../../../schema/admin.dto/admin.student.dto/admin.active.students.dto/admin.active.students.dto';
import { LeaveStatus, Role } from '@prisma/client';

// Find all active student for the admin
export async function findActiveStudents(page: number, termId: number) {
    const take = 10;
    const pageNum = page ?? 0;
    const skip = pageNum * take;

    const activeStudents = await db.student.findMany({
        where: {
            role: 'STUDENT',
            isActive: true,
            studentTermFee: {
                some: {
                    termId: +termId
                }
            }
        },
        skip,
        take,
        orderBy: {
            createdAt: 'desc'
        },
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
            },
            subjectRelated: true,
            subjectsChosen: true,
            otherInformation: {
                select: {
                    id: true,
                    otherInfo: true,
                    declaration: true
                }
            },
            skipReport: {
                select: {
                    isClosed: true
                }
            },
            schoolCheckInAttendance: {
                orderBy: {
                    date: 'desc'
                },
                take: 3
            }
        }
    });

    const count = await db.student.count({
        where: {
            role: 'STUDENT',
            isActive: true,
            studentTermFee: {
                some: {
                    termId: termId
                }
            }
        }
    });

    return { activeStudents, count };
}

// search active student for the admin
export async function searchActiveStudents(search = '', page: number, termId: number, subjectOption = '', levelOption = '', sectionOption = '', attendanceOption = '') {
    const take = 10;
    const searchAsNumber = isNaN(Number(search)) ? undefined : parseInt(search);
    if (searchAsNumber) {
        const pageNum: number = page ?? 0;
        const skip = pageNum * take;
        const latestAttendanceIds = (
            await db.student.findMany({
                where: {
                    role: 'STUDENT',
                    isActive: true
                    // ... other conditions as needed
                },
                select: {
                    id: true,
                    schoolCheckInAttendance: {
                        take: 1,
                        orderBy: { date: 'desc' },
                        select: { id: true }
                    }
                }
            })
        ).map((student) => student.schoolCheckInAttendance[0]?.id);
        const activeStudents = await db.student.findMany({
            skip,
            take,
            orderBy: {
                createdAt: 'desc'
            },
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    some: {
                        termId: termId
                    }
                },
                enrollments: {
                    some: {
                        termSubjectLevel: {
                            ...(subjectOption && { subjectId: +subjectOption }),
                            ...(levelOption && { levelId: +levelOption })
                            // ...(termId && { termId: termId })
                        },
                        ...(sectionOption && {
                            studentClassAssignment: {
                                some: { sectionId: +sectionOption }
                            }
                        })
                    }
                },
                // ...(+attendanceOption && {
                //     schoolCheckInAttendance: {
                //         some: {
                //             id: { in: latestAttendanceIds },
                //             attendanceValue: +attendanceOption
                //         }
                //     }
                // }),
                ...(attendanceOption === '0'
                    ? {
                          schoolCheckInAttendance: {
                              some: {
                                  id: { in: latestAttendanceIds },
                                  attendanceValue: { notIn: [1, 2] }
                              }
                          }
                      }
                    : +attendanceOption && {
                          schoolCheckInAttendance: {
                              some: {
                                  id: { in: latestAttendanceIds },
                                  attendanceValue: +attendanceOption
                              }
                          }
                      }),

                OR: [
                    { id: searchAsNumber },
                    {
                        personalDetails: {
                            OR: [
                                { firstName: { contains: search, mode: 'insensitive' } },
                                { lastName: { contains: search, mode: 'insensitive' } },
                                { email: { contains: search, mode: 'insensitive' } },
                                { contact: { contains: search, mode: 'insensitive' } },
                                { postcode: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    },
                    {
                        parentsDetails: {
                            OR: [
                                { fatherName: { contains: search, mode: 'insensitive' } },
                                { motherName: { contains: search, mode: 'insensitive' } },
                                { parentEmail: { contains: search, mode: 'insensitive' } },
                                { parentContact: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    }
                ]
            },
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
                },
                subjectRelated: true,
                subjectsChosen: true,
                otherInformation: {
                    select: {
                        id: true,
                        otherInfo: true,
                        declaration: true
                    }
                },
                skipReport: {
                    select: {
                        isClosed: true
                    }
                },
                schoolCheckInAttendance: {
                    orderBy: {
                        date: 'desc'
                    },
                    take: 3
                }
            }
        });
        const count = await db.student.count({
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    some: {
                        termId: termId
                    }
                },
                enrollments: {
                    some: {
                        termSubjectLevel: {
                            ...(subjectOption && { subjectId: +subjectOption }),
                            ...(levelOption && { levelId: +levelOption })
                        },
                        ...(sectionOption && {
                            studentClassAssignment: {
                                some: { sectionId: +sectionOption }
                            }
                        })
                    }
                },
                // ...(+attendanceOption && {
                //     schoolCheckInAttendance: {
                //         some: {
                //             id: { in: latestAttendanceIds },
                //             attendanceValue: +attendanceOption
                //         }
                //     }
                // }),
                ...(attendanceOption === '0'
                    ? {
                          schoolCheckInAttendance: {
                              some: {
                                  id: { in: latestAttendanceIds },
                                  attendanceValue: { notIn: [1, 2] }
                              }
                          }
                      }
                    : +attendanceOption && {
                          schoolCheckInAttendance: {
                              some: {
                                  id: { in: latestAttendanceIds },
                                  attendanceValue: +attendanceOption
                              }
                          }
                      }),

                OR: [
                    { id: searchAsNumber },
                    {
                        personalDetails: {
                            OR: [
                                { firstName: { contains: search, mode: 'insensitive' } },
                                { lastName: { contains: search, mode: 'insensitive' } },
                                { email: { contains: search, mode: 'insensitive' } },
                                { contact: { contains: search, mode: 'insensitive' } },
                                { postcode: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    },
                    {
                        parentsDetails: {
                            OR: [
                                { fatherName: { contains: search, mode: 'insensitive' } },
                                { motherName: { contains: search, mode: 'insensitive' } },
                                { parentEmail: { contains: search, mode: 'insensitive' } },
                                { parentContact: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    }
                ]
            }
        });
        return { activeStudents, count };
    } else if (!searchAsNumber) {
        console.log('inside NOT `searchAsNumber');
        const pageNum: number = page ?? 0;
        const skip = pageNum * take;
        const latestAttendanceIds = (
            await db.student.findMany({
                where: {
                    role: 'STUDENT',
                    isActive: true
                    // ... other conditions as needed
                },
                select: {
                    id: true,
                    schoolCheckInAttendance: {
                        take: 1,
                        orderBy: { date: 'desc' },
                        select: { id: true }
                    }
                }
            })
        ).map((student) => student.schoolCheckInAttendance[0]?.id);
        console.log(latestAttendanceIds, 'latestAttendanceIds');
        const activeStudents = await db.student.findMany({
            skip,
            take,
            orderBy: {
                createdAt: 'desc'
            },
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    some: {
                        termId: termId
                    }
                },
                enrollments: {
                    some: {
                        termSubjectLevel: {
                            ...(subjectOption && { subjectId: +subjectOption }),
                            ...(levelOption && { levelId: +levelOption })
                        },
                        ...(sectionOption && {
                            studentClassAssignment: {
                                some: { sectionId: +sectionOption }
                            }
                        })
                    }
                },
                // ...(+attendanceOption && {
                //     schoolCheckInAttendance: {
                //         some: {
                //             id: { in: latestAttendanceIds },
                //             attendanceValue: +attendanceOption
                //         }
                //     }
                // }),
                ...(attendanceOption === '0'
                    ? {
                          schoolCheckInAttendance: {
                              some: {
                                  id: { in: latestAttendanceIds },
                                  attendanceValue: { notIn: [1, 2] }
                              }
                          }
                      }
                    : +attendanceOption && {
                          schoolCheckInAttendance: {
                              some: {
                                  id: { in: latestAttendanceIds },
                                  attendanceValue: +attendanceOption
                              }
                          }
                      }),

                OR: [
                    {
                        personalDetails: {
                            OR: [
                                { firstName: { contains: search, mode: 'insensitive' } },
                                { lastName: { contains: search, mode: 'insensitive' } },
                                { email: { contains: search, mode: 'insensitive' } },
                                { contact: { contains: search, mode: 'insensitive' } },
                                { postcode: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    },
                    {
                        parentsDetails: {
                            OR: [
                                { fatherName: { contains: search, mode: 'insensitive' } },
                                { motherName: { contains: search, mode: 'insensitive' } },
                                { parentEmail: { contains: search, mode: 'insensitive' } },
                                { parentContact: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    }
                ]
            },
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
                },
                subjectRelated: true,
                subjectsChosen: true,
                otherInformation: {
                    select: {
                        id: true,
                        otherInfo: true,
                        declaration: true
                    }
                },
                skipReport: {
                    select: {
                        isClosed: true
                    }
                },
                schoolCheckInAttendance: {
                    orderBy: {
                        date: 'desc'
                    },
                    take: 3
                }
            }
        });
        const count = await db.student.count({
            where: {
                role: 'STUDENT',
                isActive: true,
                studentTermFee: {
                    some: {
                        termId: termId
                    }
                },
                enrollments: {
                    some: {
                        termSubjectLevel: {
                            ...(subjectOption && { subjectId: +subjectOption }),
                            ...(levelOption && { levelId: +levelOption })
                        },
                        ...(sectionOption && {
                            studentClassAssignment: {
                                some: { sectionId: +sectionOption }
                            }
                        })
                    }
                },
                // ...(+attendanceOption && {
                //     schoolCheckInAttendance: {
                //         some: {
                //             id: { in: latestAttendanceIds },
                //             attendanceValue: +attendanceOption
                //         }
                //     }
                // }),
                ...(attendanceOption === '0'
                    ? {
                          schoolCheckInAttendance: {
                              some: {
                                  id: { in: latestAttendanceIds },
                                  attendanceValue: { notIn: [1, 2] }
                              }
                          }
                      }
                    : +attendanceOption && {
                          schoolCheckInAttendance: {
                              some: {
                                  id: { in: latestAttendanceIds },
                                  attendanceValue: +attendanceOption
                              }
                          }
                      }),

                OR: [
                    {
                        personalDetails: {
                            OR: [
                                { firstName: { contains: search, mode: 'insensitive' } },
                                { lastName: { contains: search, mode: 'insensitive' } },
                                { email: { contains: search, mode: 'insensitive' } },
                                { contact: { contains: search, mode: 'insensitive' } },
                                { postcode: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    },
                    {
                        parentsDetails: {
                            OR: [
                                { fatherName: { contains: search, mode: 'insensitive' } },
                                { motherName: { contains: search, mode: 'insensitive' } },
                                { parentEmail: { contains: search, mode: 'insensitive' } },
                                { parentContact: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    }
                ]
            }
        });
        return { activeStudents, count };
    }
}

// find unqiue student by ID for internal queries
export async function findActiveStudentById(id: string) {
    const activeStudent = await db.student.findUnique({
        where: {
            id: +id,
            role: 'STUDENT',
            isActive: true
        },
        include: {
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
            },
            otherInformation: {
                select: {
                    id: true,
                    otherInfo: true,
                    declaration: true
                }
            },
            enrollments: {
                select: {
                    subjectEnrollment: true,
                    createdAt: true
                }
            },
            skipReport: {
                select: {
                    isClosed: true
                }
            }
        }
    });
    const siblings = await db.student.findMany({
        where: {
            personalDetails: {
                email: activeStudent?.personalDetails?.email
            },

            NOT: {
                id: +id // Exclude the current student
            }
        },
        include: {
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
            },
            otherInformation: {
                select: {
                    id: true,
                    otherInfo: true,
                    declaration: true
                }
            },
            enrollments: {
                select: {
                    subjectEnrollment: true,
                    createdAt: true
                }
            },
            skipReport: {
                select: {
                    isClosed: true
                }
            }
        }
    });

    return { activeStudent, siblings };
}
export async function findStudentFeeDetails(studentId: number, termId: number) {
    const studentTermFees = await db.studentTermFee.findMany({
        where: {
            studentId: studentId,
            termSubjectGroup: {
                termId
            }
        },
        include: {
            termSubjectGroup: {
                include: {
                    fee: true,
                    subjectGroup: true,
                    subject: true,
                    enrollment: {
                        where: {
                            studentId
                        },
                        select: {
                            dueDate: true,
                            subjectEnrollment: {
                                include: {
                                    termSubject: {
                                        select: {
                                            subject: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            feePayment: true
        }
    });

    return studentTermFees;
}

export async function findTermSubjectGroupIdEnrolledSubjects(id: string, termSubjectGroupId: string) {
    // Fetch all enrollments for the student
    const enrollments = await db.enrollment.findMany({
        where: {
            studentId: parseInt(id),
            termSubjectGroup: {
                id: +termSubjectGroupId
            }
        },
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
    });

    // Extract the subjects from the enrollments
    let enrolledSubjects: { subjectId: number; subjectName: string }[] = [];
    enrollments.forEach((enrollment) => {
        if (enrollment.subjectEnrollment) {
            // Check if subjectEnrollment exists
            const se = enrollment.subjectEnrollment;
            enrolledSubjects.push({
                subjectId: se.termSubject.subjectId,
                subjectName: se.termSubject.subject.name
                // Include additional subject details as needed
            });
        }
    });

    return enrolledSubjects;
}
/*find fee details by id*/
export async function findFeePaymentById(id: string) {
    const feePaymentById = await db.feePayment.findUnique({
        where: {
            id: +id
        }
    });
    return feePaymentById;
}
/*update fee - amount paid made by the admin*/
export async function updateAmountPaid(id: string, newAmountPaid: string, remarks: string) {
    const amountPaid = parseInt(newAmountPaid);
    const currentFeePayment = await db.feePayment.findUnique({
        where: { id: +id },
        select: { dueAmount: true, amountPaid: true, creditAmount: true }
    });
    if (!currentFeePayment) {
        throw customError('Fee payment record not found', 'fail', 400, true);
    }

    // Apply existing credit to reduce due amount
    let remainingDueAmount = currentFeePayment.dueAmount - currentFeePayment.creditAmount;

    // Apply payment to remaining due amount
    remainingDueAmount -= amountPaid;
    // Calculate new credit amount
    let newCreditAmount = 0;
    if (remainingDueAmount < 0) {
        newCreditAmount = Math.max(amountPaid - currentFeePayment.dueAmount, 0);
        remainingDueAmount = 0;
    }

    // Update the fee payment record

    const updatedFeePayment = await db.feePayment.update({
        where: { id: +id },
        data: {
            amountPaid: currentFeePayment.amountPaid + amountPaid,
            dueAmount: remainingDueAmount,
            creditAmount: newCreditAmount,
            status: remainingDueAmount > 0 ? 'PENDING' : 'NODUES',
            method: 'DISCOUNT',
            paidDate: new Date(),
            remarks
        }
    });

    return updatedFeePayment;
}

export async function findActiveStudentEnrolledSubjects(studentId: string, termId: string) {
    // Fetch all enrollments for the student
    const enrollments = await db.enrollment.findMany({
        where: {
            studentId: parseInt(studentId),
            termSubjectGroup: {
                termId: +termId
            }
        },
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
    });
    // Extract the subjects from the enrollments
    let enrolledSubjects: { subjectId: number; subjectName: string }[] = [];
    enrollments.forEach((enrollment) => {
        if (enrollment.subjectEnrollment) {
            // Check if subjectEnrollment exists
            const se = enrollment.subjectEnrollment;
            enrolledSubjects.push({
                subjectId: se.termSubject.subjectId,
                subjectName: se.termSubject.subject.name
                // Include additional subject details as needed
            });
        }
    });

    return enrolledSubjects;
}

// find current term for assign classes to active students
export const findCurrentTermToAssignClass = async () => {
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
                        select: { name: true, id: true }
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

/****** * assign class to student*****/
export async function assignClassToStudent(studentId: string, termId: string, subjectName: string, levelName: string, sectionName: string) {
    // console.log(sectionName);
    // Find Subject ID
    const subject = await db.subject.findUnique({
        where: {
            name: subjectName
        }
    });

    if (!subject) {
        throw customError(`Subject not found: ${subjectName}`, 'fail', 404, true);
    }

    // Find TermSubjectLevel ID
    const termSubjectLevel = await db.termSubjectLevel.findFirst({
        where: {
            termId: +termId,
            subjectId: subject.id,
            level: {
                name: levelName
            }
        }
    });

    if (!termSubjectLevel) {
        throw customError(`TermSubjectLevel not found for ${subjectName} in ${levelName}`, 'fail', 404, true);
    }
    // Find the Section
    let section = await db.section.findFirst({
        where: {
            name: sectionName
        }
    });
    if (!section) {
        throw customError(`section not found for ${subjectName} in ${levelName}`, 'fail', 404, true);
    }
    // console.log(section);
    // Find SubjectEnrollment and Enrollment ID
    const subjectEnrollment = await db.subjectEnrollment.findFirst({
        where: {
            termSubject: {
                subjectId: subject.id,
                termId: +termId
            },
            enrollment: {
                studentId: +studentId
            }
        },
        include: {
            enrollment: true // This includes the enrollment data
        }
    });

    if (!subjectEnrollment || !subjectEnrollment.enrollment) {
        throw customError(`Enrollment not found for student ${studentId} in subject ${subjectName}`, 'fail', 404, true);
    }

    // Find or create StudentClassAsstudentClassAssignment Record
    const existingRecord = await db.studentClassAssignment.findFirst({
        where: {
            enrollmentId: subjectEnrollment.enrollment.id,
            termSubjectLevelId: termSubjectLevel.id,
            studentId: +studentId,
            sectionId: section.id
        }
    });
    // console.log(existingRecord);
    if (existingRecord) {
        // Update if already assigned
        await db.studentClassAssignment.update({
            where: {
                id: existingRecord.id
            },
            data: {
                isCurrentlyAssigned: true,
                sectionId: section.id // Update sectionId
            }
        });
    } else {
        // Create new assignment
        await db.studentClassAssignment.create({
            data: {
                enrollmentId: subjectEnrollment.enrollment.id,
                termSubjectLevelId: termSubjectLevel.id,
                studentId: +studentId,
                isCurrentlyAssigned: true,
                sectionId: section.id // Assign sectionId
            }
        });
    }
    await db.enrollment.update({
        where: {
            id: subjectEnrollment.enrollment.id
        },
        data: {
            termSubjectLevelId: termSubjectLevel.id
        }
    });

    return { message: 'Class assigned successfully' };
}

/****** * remove/ delete  class for  student*****/
export async function deleteClassAssignment(id: string) {
    // Check if the class assignment exists
    const classAssignment = await db.studentClassAssignment.findUnique({
        where: {
            id: +id
        }
    });

    if (!classAssignment) {
        throw new Error('Class assignment not found with the given ID.');
    }

    // Delete the class assignment
    await db.studentClassAssignment.delete({
        where: {
            id: +id
        }
    });

    return { message: 'Class assignment deleted successfully' };
}

/*get all classes for students*/
export async function findUniqueStudentClassDetails(studentId: string) {
    const studentClassAssignmentRecords = await db.studentClassAssignment.findMany({
        where: {
            studentId: +studentId
        },
        include: {
            termSubjectLevel: {
                include: {
                    subject: true,
                    level: true
                }
            },
            section: {
                select: {
                    name: true
                }
            }
        },
        orderBy: {
            id: 'desc'
        }
    });

    return studentClassAssignmentRecords;
}
/*Manage classes for students*/
export async function manageClasses(id: string) {
    const currentRecord = await db.studentClassAssignment.findUnique({
        where: { id: +id }
    });
    const updatedStudentClassAsstudentClassAssignmentRecords = await db.studentClassAssignment.update({
        where: { id: +id },
        data: { isCurrentlyAssigned: !currentRecord?.isCurrentlyAssigned }
    });
    return updatedStudentClassAsstudentClassAssignmentRecords;
}
/*enroll subjects to active students*/
export async function enrollActiveStudent(enrollData: ActiveStudentEnrollDataSchema['body']) {
    let alreadyEnrolledSubjects = [];

    for (const enrollmentItem of enrollData.enrollData) {
        const existingEnrollments = await db.enrollment.findMany({
            where: { studentId: enrollData.activeStudentId, termSubjectGroupId: enrollmentItem.termSubjectGroupId },
            include: { subjectEnrollment: { include: { termSubject: true } } }
        });

        for (const enrollment of existingEnrollments) {
            if (enrollment.subjectEnrollment && enrollment.subjectEnrollment.termSubjectId === enrollmentItem.termSubjectId) {
                alreadyEnrolledSubjects.push(enrollmentItem.subject);
            }
        }
    }

    if (alreadyEnrolledSubjects.length > 0) {
        throw customError(`Already enrolled in subjects: ${alreadyEnrolledSubjects.join(', ')}`, 'fail', 400, true);
    }

    let uniqueTermSubjectGroupIds = new Set<number>();

    for (const enrollmentItem of enrollData.enrollData) {
        uniqueTermSubjectGroupIds.add(enrollmentItem.termSubjectGroupId);

        const feeInfo = await db.termSubjectGroup.findUnique({
            where: { id: enrollmentItem.termSubjectGroupId },
            include: { fee: true, term: true }
        });

        // Determine due date
        let dueDate = new Date();
        if (feeInfo?.fee?.paymentType === 'MONTHLY') {
            const now = new Date();
            dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            dueDate.setDate(dueDate.getDate() - 5);
        } else if (feeInfo?.fee?.paymentType === 'TERM') {
            const termStartDate = new Date(feeInfo.term.startDate);
            dueDate = new Date(termStartDate.setMonth(termStartDate.getMonth() + 2));
        }

        const newEnrollment = await db.enrollment.create({
            data: {
                studentId: enrollData.activeStudentId,
                termSubjectGroupId: enrollmentItem.termSubjectGroupId,
                dueDate: dueDate
            },
            select: { id: true }
        });

        const newSubjectEnrollment = await db.subjectEnrollment.create({
            data: {
                enrollmentId: newEnrollment.id,
                termSubjectId: enrollmentItem.termSubjectId
            }
        });
        await db.enrollment.update({
            where: { id: newEnrollment.id },
            data: { subjectEnrollmentId: newSubjectEnrollment.id }
        });
    }

    // Create feePayment records based on unique TermSubjectGroupIds
    for (const termSubjectGroupId of uniqueTermSubjectGroupIds) {
        const feeInfo = await db.termSubjectGroup.findUnique({
            where: { id: termSubjectGroupId },
            include: { fee: true, enrollment: true }
        });

        if (feeInfo?.feeId) {
            const studentTermFee = await db.studentTermFee.upsert({
                where: {
                    studentId_termSubjectGroupId_termId: {
                        studentId: enrollData.activeStudentId,
                        termSubjectGroupId: termSubjectGroupId,
                        termId: feeInfo.termId
                    }
                },
                update: {},
                create: {
                    studentId: enrollData.activeStudentId,
                    termSubjectGroupId: termSubjectGroupId,
                    termId: feeInfo.termId
                },
                select: { id: true }
            });

            const existingFeePayment = await db.feePayment.findFirst({
                where: {
                    studentTermFeeId: studentTermFee.id,
                    feeId: feeInfo.feeId
                }
            });
            if (!existingFeePayment) {
                await db.feePayment.create({
                    data: {
                        feeId: feeInfo.feeId,
                        studentTermFeeId: studentTermFee.id,
                        dueDate: feeInfo?.enrollment?.find((en) => en.termSubjectGroupId === termSubjectGroupId)?.dueDate || new Date(),
                        amountPaid: 0,
                        dueAmount: feeInfo.fee?.amount || 0,
                        status: 'PENDING',
                        method: 'NA',
                        feeAmount: feeInfo.fee?.amount || 0
                    }
                });
            }
        }
    }

    return { message: 'Enrollment successful' };
}

/* de-enroll active student to subjects */
export async function deEnrollActiveStudent(deEnrollData: ActiveStudentEnrollDataSchema['body']) {
    // Check total number of subjects enrolled in the term
    const termId = deEnrollData.enrollData[0].termId;
    const totalEnrollments = await db.enrollment.count({
        where: {
            studentId: deEnrollData.activeStudentId,
            termSubjectGroup: {
                termId: termId
            }
        }
    });

    if (totalEnrollments <= deEnrollData.enrollData.length) {
        throw customError('The student must be enrolled in at least one subject.', 'fail', 400, true);
    }

    let deEnrolledSubjects = [];

    for (const deEnrollItem of deEnrollData.enrollData) {
        // Find the SubjectEnrollment record
        const subjectEnrollment = await db.subjectEnrollment.findFirst({
            where: {
                termSubjectId: deEnrollItem.termSubjectId,
                enrollment: {
                    studentId: deEnrollData.activeStudentId,
                    termSubjectGroupId: deEnrollItem.termSubjectGroupId
                }
            }
        });

        if (!subjectEnrollment) {
            throw customError(`Not enrolled in subject: ${deEnrollItem.subject}`, 'fail', 400, true);
        }

        // Delete the SubjectEnrollment record
        await db.subjectEnrollment.delete({
            where: { id: subjectEnrollment.id }
        });

        // Delete the Enrollment record
        await db.enrollment.delete({
            where: { id: subjectEnrollment.enrollmentId }
        });

        // Check for remaining enrollments in the same TermSubjectGroup
        const remainingEnrollments = await db.enrollment.count({
            where: {
                studentId: deEnrollData.activeStudentId,
                termSubjectGroupId: deEnrollItem.termSubjectGroupId
            }
        });

        // If no remaining enrollments, handle StudentTermFee and FeePayment records
        if (remainingEnrollments === 0) {
            const studentTermFee = await db.studentTermFee.findFirst({
                where: {
                    studentId: deEnrollData.activeStudentId,
                    termSubjectGroupId: deEnrollItem.termSubjectGroupId,
                    termId: deEnrollItem.termId
                }
            });

            if (studentTermFee) {
                // Delete associated FeePayment records
                await db.feePayment.deleteMany({
                    where: { studentTermFeeId: studentTermFee.id }
                });

                // Delete the StudentTermFee record
                await db.studentTermFee.delete({
                    where: { id: studentTermFee.id }
                });
            }
        }

        deEnrolledSubjects.push(deEnrollItem.subject);
    }

    return {
        message: 'De-enrollment process completed',
        deEnrolledSubjects
    };
}

// find term to enroll
export async function findTermToEnrollActiveStudent() {
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
                    termSubjectGroup: true
                }
            }
        }
    });

    // if (!currentTerm) {
    //     throw customError(`current Term could not found. Please try again later`, 'fail', 404, true);
    // }

    return currentTerm;
}
// last two schoolattendanace
export async function fetchRecentSchoolAttendanceForStudent(studentId: string) {
    const attendanceRecords = await db.schoolCheckInAttendance.findMany({
        where: {
            studentId: +studentId
        },
        orderBy: {
            date: 'desc'
        },
        take: 2
    });

    if (!attendanceRecords) {
        throw customError('Attendance records not found for the student.', 'fail', 404, true);
    }

    return attendanceRecords;
}

// Leave
export async function createLeaveApplication(studentId: string, appliedById: string, appliedByRole: string, startDate: string, endDate: string, reason: string, status: string, comments: string) {
    const formattedStartDate = new Date(startDate);
    formattedStartDate.setHours(0, 0, 0, 0); // Set start date to beginning of the day

    const formattedEndDate = new Date(endDate);
    formattedEndDate.setHours(23, 59, 59, 999); // Set end date to end of the day
    const existingLeave = await db.leave.findFirst({
        where: {
            studentId: +studentId,
            NOT: [{ endDate: { lt: formattedStartDate } }, { startDate: { gt: formattedEndDate } }]
        }
    });

    if (existingLeave) {
        throw customError('A leave application already exists within the specified date range', 'fail', 400, true);
    }
    const leaveApplication = await db.leave.create({
        data: {
            studentId: +studentId,
            appliedById: +appliedById,
            appliedByRole: appliedByRole === 'ADMIN' ? 'ADMIN' : 'STUDENT',
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            comments,
            reason: reason,
            status: status === 'APPROVED' ? 'APPROVED' : status === 'DECLINED' ? 'DECLINED' : 'PENDING',
            approvedOn: status === 'APPROVED' ? new Date() : null,
            approverId: status === 'APPROVED' ? +appliedById : null
        }
    });
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const currentEndDate = new Date();
    currentEndDate.setHours(23, 59, 59, 999);
    if (formattedStartDate <= currentEndDate && formattedEndDate >= currentDate && status === 'APPROVED') {
        // Find the schoolCheckInAttendance record for the current day
        const schoolAttendanceRecord = await db.schoolCheckInAttendance.findFirst({
            where: {
                studentId: +studentId,
                date: {
                    gte: currentDate,
                    lte: currentEndDate
                }
            }
        });

        if (schoolAttendanceRecord) {
            // Update the schoolCheckInAttendance record to mark isOnLeave as true
            await db.schoolCheckInAttendance.update({
                where: {
                    id: schoolAttendanceRecord.id
                },
                data: {
                    isOnLeave: true
                }
            });
        }

        // Find and update classAttendance records for the current day
        const classAttendanceRecords = await db.classAttendance.findMany({
            where: {
                studentClassAssignment: {
                    studentId: +studentId
                },
                date: currentDate
            }
        });

        classAttendanceRecords.forEach(async (record) => {
            await db.classAttendance.update({
                where: {
                    id: record.id
                },
                data: {
                    attendanceStatus: 'LEAVE'
                }
            });
        });
    }

    return leaveApplication;
}

export async function updateLeaveApplication(leaveId: string, updatedById: string, reason: string, comments = '', status: string, startDate: string, endDate: string) {
    const formattedStartDate = new Date(startDate);
    formattedStartDate.setHours(0, 0, 0, 0); // Set start date to beginning of the day

    const formattedEndDate = new Date(endDate);
    formattedEndDate.setHours(23, 59, 59, 999); // Set end date to end of the day
    const currentLeave = await db.leave.findUnique({ where: { id: +leaveId } });
    if (!currentLeave) {
        throw customError('Leave application not found.', 'fail', 400, true);
    }
    const overlappingLeave = await db.leave.findFirst({
        where: {
            AND: [
                { id: { not: +leaveId } },
                { studentId: currentLeave.studentId },
                {
                    NOT: [{ endDate: { lt: formattedStartDate } }, { startDate: { gt: formattedEndDate } }]
                }
            ]
        }
    });

    if (overlappingLeave) {
        throw customError('Another leave application already exists within the specified date range.', 'fail', 400, true);
    }
    const updatedLeaveApplication = await db.leave.update({
        where: { id: +leaveId },
        data: {
            comments,
            reason: reason,
            status: status === 'APPROVED' ? 'APPROVED' : status === 'DECLINED' ? 'DECLINED' : 'PENDING',
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            approvedOn: status === 'APPROVED' ? new Date() : null,
            approverId: status === 'APPROVED' ? +updatedById : null
        }
    });
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const currentEndDate = new Date();
    currentEndDate.setHours(23, 59, 59, 999);

    if (formattedStartDate <= currentEndDate && formattedEndDate >= currentDate && status === 'APPROVED') {
        // Find the schoolCheckInAttendance record for the current day
        const schoolAttendanceRecord = await db.schoolCheckInAttendance.findFirst({
            where: {
                studentId: currentLeave.studentId,
                date: {
                    gte: currentDate,
                    lte: currentEndDate
                }
            }
        });

        if (schoolAttendanceRecord) {
            // Update the schoolCheckInAttendance record to mark isOnLeave as true
            await db.schoolCheckInAttendance.update({
                where: {
                    id: schoolAttendanceRecord.id
                },
                data: {
                    isOnLeave: true
                }
            });
        }

        // Find and update classAttendance records for the current day
        const classAttendanceRecords = await db.classAttendance.findMany({
            where: {
                studentClassAssignment: {
                    studentId: currentLeave.studentId
                },
                date: currentDate
            }
        });

        classAttendanceRecords.forEach(async (record) => {
            await db.classAttendance.update({
                where: {
                    id: record.id
                },
                data: {
                    attendanceStatus: 'LEAVE'
                }
            });
        });
    }

    return updatedLeaveApplication;
}

export async function deleteLeaveApplication(leaveId: string) {
    const leaveApplication = await db.leave.findUnique({
        where: { id: +leaveId },
        select: {
            studentId: true,
            startDate: true,
            endDate: true
        }
    });

    if (!leaveApplication) {
        throw customError('Leave application not found.', 'fail', 400, true);
    }
    const { studentId, startDate, endDate } = leaveApplication;
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Update schoolCheckInAttendance records
    await db.schoolCheckInAttendance.updateMany({
        where: {
            studentId: studentId,
            date: {
                gte: startDate,
                lte: endDate
            }
        },
        data: {
            isOnLeave: false
        }
    });
    // Update classAttendance records
    await db.classAttendance.updateMany({
        where: {
            studentClassAssignment: {
                studentId: studentId
            },
            date: {
                gte: startDate,
                lte: endDate
            }
        },
        data: {
            // Update this logic to set the appropriate attendance status
            attendanceStatus: 'ABSENT'
        }
    });
    await db.leave.delete({
        where: { id: +leaveId }
    });
}

export async function fetchLeavesForStudent(studentId: number) {
    const leaveApplications = await db.leave.findMany({
        where: { studentId: studentId }
    });

    return leaveApplications;
}
export async function findLeaveById(leaveId: number) {
    const leaveApplication = await db.leave.findUnique({
        where: { id: leaveId }
    });

    if (!leaveApplication) {
        throw customError('Leave application not found', 'fail', 400, true);
    }

    return leaveApplication;
}
