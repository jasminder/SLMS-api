import { db } from '../../../utils/db.server';
import { customError } from '../../../utils/customError';

// Fetch all students who are checked in for the current day for checkingout at the end of school day
export async function fetchCheckedInStudentsForCheckout() {
    const currentDate = new Date().toISOString().split('T')[0]; // Get the date in "YYYY-MM-DD" format

    const checkedInStudents = await db.schoolCheckInAttendance.findMany({
        where: {
            date: currentDate,
            checkedIn: true,
            isMarked: true
        },
        include: {
            student: true // Include the student details
        }
    });

    return checkedInStudents;
}
/*reposne of the above  funcyion is [
  {
    "student": {
      "id": 1,
      "name": "Alice",
      "rollNumber": "A101",
      "isActive": true,
      "role": "STUDENT"
    },
    "id": 1,
    "studentId": 1,
    "isMarked": true,
    "date": "2024-01-13T00:00:00.000Z",
    "checkInTime": "2024-01-13T08:00:00.000Z",
    "checkedIn": true,
    "remarks": "Checked in at the entrance"
  },
  {
    "student": {
      "id": 2,
      "name": "Bob",
      "rollNumber": "B102",
      "isActive": true,
      "role": "STUDENT"
    },
    "id": 2,
    "studentId": 2,
    "isMarked": true,
    "date": "2024-01-13T00:00:00.000Z",
    "checkInTime": "2024-01-13T08:15:00.000Z",
    "checkedIn": true,
    "remarks": "Checked in at the entrance"
  }
]
*/

// Function to mark a student as checked out in SchoolCheckInAttendance records
export async function markStudentAsCheckedOut(studentId: string) {
    const currentDate = new Date().toISOString().split('T')[0]; // Get today's date in "YYYY-MM-DD" format

    // Find the SchoolCheckInAttendance record for the student and current date
    const attendanceRecord = await db.schoolCheckInAttendance.findFirst({
        where: {
            studentId: +studentId,
            date: currentDate,
            isMarked: true,
            checkedIn: true // Ensure that the student is checked in
        }
    });

    if (!attendanceRecord) {
        // If there's no record, it means the student is not checked in today
        throw customError(`Student ID ${studentId} is not checked in for today.`, 'fail', 400, true);
    }

    if (attendanceRecord.isCheckedOut) {
        // If the student is already checked out, you can handle this case accordingly, like skipping it or logging an error
        throw customError(`Student ID ${studentId} is already checked out for today.`, 'fail', 400, true);
    }

    // Update the SchoolCheckInAttendance record to mark the student as checked out
    await db.schoolCheckInAttendance.update({
        where: {
            id: attendanceRecord.id
        },
        data: {
            isCheckedOut: true, // Mark the student as checked out
            checkOutTime: new Date() // Set the check-out time to the current time
        }
    });
}

// Function to mark multiple students as checked out in SchoolCheckInAttendance records
export async function markSelectedStudentsAsCheckedOut(studentIds: string[]) {
    const currentDate = new Date().toISOString().split('T')[0]; // Get today's date in "YYYY-MM-DD" format
    const numericStudentIds = studentIds.map(Number);

    // Find the SchoolCheckInAttendance records for the specified student IDs and current date
    const attendanceRecords = await db.schoolCheckInAttendance.findMany({
        where: {
            studentId: {
                in: numericStudentIds
            },
            date: currentDate,
            checkedIn: true, // Ensure that the students are checked in
            isMarked: true
        }
    });

    for (const attendanceRecord of attendanceRecords) {
        // Update each SchoolCheckInAttendance record to mark the student as checked out
        await db.schoolCheckInAttendance.update({
            where: {
                id: attendanceRecord.id
            },
            data: {
                isCheckedOut: true, // Mark the student as checked out
                checkOutTime: new Date() // Set the check-out time to the current time
            }
        });
    }

    return attendanceRecords;
}
