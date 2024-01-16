import { customError } from '../../../utils/customError';
import { db } from '../../../utils/db.server';

/* fetching the check-in record for students who have checked in with default class-attendance */
// export async function fetchCheckedInStudentsWithAttendance(termSubjectLevelId: string, sectionName: string) {
//     const numericTermSubjectLevelId = parseInt(termSubjectLevelId);

//     // Find all students who are currently assigned to the specified class and are active
//     const classAssignments = await db.studentClassAssignment.findMany({
//         where: {
//             termSubjectLevelId: numericTermSubjectLevelId,
//             section: {
//                 name: sectionName
//             },
//             isCurrentlyAssigned: true
//         },
//         include: {
//             student: true // Include additional student details as needed
//         }
//     });
//     const startDate = new Date();
//     startDate.setHours(0, 0, 0, 0); // Set time to start of the day

//     const endDate = new Date();
//     endDate.setHours(23, 59, 59, 999);
//     // Find all students in a class who are checked in to the school , check-in data and ClassAttendance records for each student in the same class
//     const studentsWithCheckInAndAttendance = await Promise.all(
//         classAssignments.map(async (assignment) => {
//             // Find the SchoolCheckInAttendance record for the student on the current date
//             const checkInData = await db.schoolCheckInAttendance.findFirst({
//                 where: {
//                     studentId: assignment.student.id,
//                     date: {
//                         gte: startDate,
//                         lte: endDate
//                     }, // Get today's date in "YYYY-MM-DD" format
//                     checkedIn: true,
//                     isMarked: true // Ensure that the student has checked in
//                 }
//             });

//             return checkInData;
//         })
//     );
//     console.log('checkedin students data',studentsWithCheckInAndAttendance, );
//     // fetch ClassAttendance records for each student
//     const studentsWithAttendance = await Promise.all(
//         studentsWithCheckInAndAttendance.map(async (studentData) => {
//             // Find the ClassAttendance record for the student on the current date
//             const classAttendanceData = await db.classAttendance.findFirst({
//                 where: {
//                     studentClassAssignmentId: studentData?.id,
//                     date: {
//                         gte: startDate,
//                         lte: endDate
//                     } // Get today's date in "YYYY-MM-DD" format
//                 }
//             });

//             return {
//                 ...studentData,
//                 classAttendance: classAttendanceData || null // Include ClassAttendance record if available
//             };
//         })
//     );

//     console.log(studentsWithAttendance);

//     return studentsWithAttendance;
// }

export async function fetchCheckedInStudentsWithAttendance(termSubjectLevelId: string, sectionName: string) {
    const numericTermSubjectLevelId = parseInt(termSubjectLevelId);

    // Find students who are currently assigned to the specified class and are active
    const classAssignments = await db.studentClassAssignment.findMany({
        where: {
            termSubjectLevelId: numericTermSubjectLevelId,
            section: {
                name: sectionName
            },
            isCurrentlyAssigned: true
        },
        include: {
            student: {
                include: {
                    personalDetails: true
                }
            }
        }
    });

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    // Fetch SchoolCheckInAttendance for each student in the same class
    const studentsWithCheckInAndAttendance = await Promise.all(
        classAssignments.map(async (assignment) => {
            const checkInData = await db.schoolCheckInAttendance.findFirst({
                where: {
                    studentId: assignment.student.id,
                    date: {
                        gte: startDate,
                        lte: endDate
                    },
                    checkedIn: true,
                    isMarked: true
                }
            });

            // Find the corresponding ClassAttendance record using schoolCheckInAttendanceId and studentClassAssignmentId
            const classAttendanceData = await db.classAttendance.findFirst({
                where: {
                    schoolCheckInAttendanceId: checkInData?.id,
                    studentClassAssignmentId: assignment.id,
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });

            return {
                student: assignment.student,
                checkInData: checkInData,
                classAttendance: classAttendanceData || null
            };
        })
    );

    // Filter out null entries (students who weren't checked in)
    const filteredStudents = studentsWithCheckInAndAttendance.filter((student) => student !== null);

    // console.log(filteredStudents);

    return studentsWithCheckInAndAttendance;
}

export async function markStudentAsPresent(studentId: string, studentClassAssignmentId: string) {
    // Update the existing ClassAttendance record to mark the student as "PRESENT"

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const updatedClassAttendanceRecord = await db.classAttendance.updateMany({
        where: {
            studentClassAssignmentId: +studentClassAssignmentId,
            date: {
                gte: startDate,
                lte: endDate
            },
            attendanceStatus: 'ABSENT',
            studentClassAssignment: {
                studentId: +studentId
            }
        },
        data: {
            attendanceStatus: 'PRESENT'
        }
    });
    if (!updatedClassAttendanceRecord) {
        throw customError(`Failed to mark student as PRESENT.`, 'fail', 400, true);
    }
    return updatedClassAttendanceRecord;
}

/* create student skip report*/
export async function createSkipReport(studentId: string, teacherId: string, reason: string) {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    if (!reason) {
        throw customError('Reason is required to create a skip report.', 'fail', 400, true);
    }

    const skipReport = await db.skipReport.create({
        data: {
            studentId: +studentId,
            teacherId: +teacherId,
            date: new Date(),
            reason
        }
    });
    return skipReport;
}
