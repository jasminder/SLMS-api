import { customError } from '../../../utils/customError';
import { db } from '../../../utils/db.server';

/* fetching the check-in record for students who have checked in with default class-attendance */
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
            student: true // Include additional student details as needed
        }
    });

    // Fetch check-in data and ClassAttendance records for each student in the same class
    const studentsWithCheckInAndAttendance = await Promise.all(
        classAssignments.map(async (assignment) => {
            // Find the SchoolCheckInAttendance record for the student on the current date
            const checkInData = await db.schoolCheckInAttendance.findFirst({
                where: {
                    studentId: assignment.student.id,
                    date: new Date().toISOString().split('T')[0], // Get today's date in "YYYY-MM-DD" format
                    checkedIn: true // Ensure that the student has checked in
                },
                select: {
                    remarks: true // Include remarks from SchoolCheckInAttendance
                }
            });

            return {
                student: assignment.student,
                checkInRemarks: checkInData?.remarks || null // Include check-in remarks if available
            };
        })
    );

    // fetch ClassAttendance records for each student
    const studentsWithAttendance = await Promise.all(
        studentsWithCheckInAndAttendance.map(async (studentData) => {
            // Find the ClassAttendance record for the student on the current date
            const classAttendanceData = await db.classAttendance.findFirst({
                where: {
                    studentClassAssignmentId: studentData.student.id,
                    date: new Date().toISOString().split('T')[0] // Get today's date in "YYYY-MM-DD" format
                }
            });

            return {
                ...studentData,
                classAttendance: classAttendanceData || null // Include ClassAttendance record if available
            };
        })
    );

    console.log(studentsWithAttendance);

    return studentsWithAttendance;
}

export async function markStudentAsPresent(studentId: string, studentClassAssignmentId: string) {
    // Update the existing ClassAttendance record to mark the student as "PRESENT"
    const currentDate = new Date().toISOString().split('T')[0];
    const updatedClassAttendanceRecord = await db.classAttendance.updateMany({
        where: {
            studentClassAssignmentId: +studentClassAssignmentId,
            date: currentDate,
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
    const date = new Date().toISOString().split('T')[0];
    if (!reason) {
        throw customError('Reason is required to create a skip report.', 'fail', 400, true);
    }

    const skipReport = await db.skipReport.create({
        data: {
            studentId: +studentId,
            teacherId: +teacherId,
            date,
            reason
        }
    });
    return skipReport;
}
