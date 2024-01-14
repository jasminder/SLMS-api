My requirement is now different. The student will enroll to a subject in a term and not subjectGroup or the levels in a subject. The student should be able to enroll for multiple subjects across any
subject in a term and these subjects can belong to different subjectgroup.

The student is charged a fee based on which subject group he belongs to. WHihc means , A student can take as many subjects in a subjectgroup and will be charged only a flat fee for the subject group.
FOr example, Term 1 , of 6 months period, has two subject groups. Group 1 contains one subject called music , having levels L1 and L2 and fee for the group is 200 and is mothly charged Second subject
group called group 2 , contains three subjects called maths , english, biology , each having levels L1 and L2 and L3 and fee for the group is 100 and is charged every three months.

A student called bob can enroll to music and maths and english and will be charged 200+100 = 300

So the fee payable by bob for music is monthly, since group 1 os monthly charged and for maths and english is paid every 3 months sinc group 2 is charged 3 months.

So bob should be charged fee and fee payable amount and due date based on subject group. But bob should be enrolled to a subject in a term . enrolling bob to a subject in a term will enure the teacher
to give feedback for bob for a subject in a term.

Now suggest what modifictaion is to be made in my schema. for enrollment , fee, termsubject and any other tables/models to be modified.

Bob can also enroll in term 2 , and can enroll for group 2 for maths and english . Which means admin should be able to query historical data for bob in term 1 . So which means term should be
considered along with subjects for enrolling bob right?

1)Now my requiremnt is i need to make sections for each subject at the level in a term. And this will be unique for a term for a subject and for a level. therefore A term called term1 can have subject
called Maths with two levels L1 and L2. we can have sections like S1 and S2 sections for Maths at L1 level. We can also have section like S1 and S2 and S3 sections for Maths L2 Level. A section name cannot
appear twice for a subject and level , for example, Maths at L1 level cannot have S1 twice.  I also need to re use the sections
names across different term .Modify my schema to create a new model for section and other association.

2)also , as an example, now bob is enrolled to music , which is under group 1. and is assigned to music L1 S1. bob is also enrolled to maths and english which is under group2 and is assigned to class
maths L2S1 and english L2S1. Admin can then re assign bob from maths L2S1  to maths L2S2 and from english L2S1. to english L1S1, if the admin requires to do so.

so admin should be able to change classes like the above.

I making the section at the levels for a subject. Meaning i want to create sections for L1 and L2 for a subject. Also To enable tracking of historical data about student enrollments in classes like
"Maths L1 S1" or "Maths L2 S2" over different terms. Therefore admin should be able to query classes assigned to student in the past,

3)for this requirment "I need to get the historical data of which class like "Maths L1 S1" or "Maths L2 S2" the student is assigned to . so the admin should be able to see how and where the students
are assigned to which class in previous terms."

4)So shouldnt I create a new model called termsubjectlevel model? why or why not. like between SubjectEnrollment and TermSubjectLevel seems to be a one-to-many relationship from SubjectEnrollment to
TermSubjectLevel, and a one-to-one relationship from TermSubjectLevel to SubjectEnrollment.


ok , now that the admin has approved a teacher application with subjects and now is a teacher . Now The admin must assign classes to the teacher and create a record in model TeacherClassAssignment {
  id                 Int              @id @default(autoincrement())
  teacherId          Int
  termSubjectLevelId Int
  sectionId          Int
  timeSlot           String?
  teacher            Teacher          @relation(fields: [teacherId], references: [id])
  termSubjectLevel   TermSubjectLevel @relation(fields: [termSubjectLevelId], references: [id])
  section            Section          @relation(fields: [sectionId], references: [id])

  @@unique([teacherId, termSubjectLevelId, sectionId])
}

So while creating a class, which is termSubjectLevel,  it. must be made sure that the
/////////
in my model SubjectEnrollment {
  id            Int         @id @default(autoincrement())
  enrollmentId  Int         @unique
  termSubjectId Int
  grade         String      @default("No Grades yet") // Optional, for storing grades
  attendance    Boolean[] // Optional, for storing attendance
  enrollment    Enrollment  @relation(fields: [enrollmentId], references: [id])
  termSubject   TermSubject @relation(fields: [termSubjectId], references: [id])

  @@unique([enrollmentId, termSubjectId])
}
/////////////////
 i have attendance. Now my requirement for attendance has changed in the folllowing way.
 ""Attendance is a two-step process. The admin will mark the 1st  attendance for ALL students, before going to the class after the admin makes the attendance, say at the entrance of the school, this is how the admin checks the students into the school. After this 1st attendance is marked or checked in,  the students are then sent to their respective classes, which is studentClassAssignment.
Now once they are in their respective classes, which is in the studentClassAssignment, in the DB/schema the teacher then proceeds to mark the 2nd  attendance for the students.
this is to ensure that all the students who marked 1st attendance or checked have gone to their classes and do not skip the class.


model SchoolCheckInAttendance {
  id           Int       @id @default(autoincrement())
  studentId    Int
  date         DateTime  // The date of check-in
  checkInTime  DateTime  // The time of check-in
  remarks      String?   // Optional field for notes

  student      Student   @relation(fields: [studentId], references: [id])

  @@unique([studentId, date]) // Ensuring uniqueness for check-in entry per student per day
}
model ClassAttendance {
  id                      Int                   @id @default(autoincrement())
  studentClassAssignmentId Int
  date                    DateTime              // The date of the class
  attendanceStatus        AttendanceStatus      // Enum for presence, absence, etc.
  remarks                 String?               // Optional field for any notes

  studentClassAssignment  StudentClassAssignment @relation(fields: [studentClassAssignmentId], references: [id])

  @@unique([studentClassAssignmentId, date]) // Ensuring uniqueness for attendance entry per class per day
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  EXCUSED
  LATE
  TARDY
  NO_CHECK_IN
  // Add more statuses as needed
}
[
  {
    "id": 1,
    "studentId": 123,
    "date": "2024-01-15",
    "checkInTime": "2024-01-15T08:30:00Z",
    "checkedIn": true,
    "remarks": "On time"
  },
  {
    "id": 2,
    "studentId": 123,
    "date": "2024-01-16",
    "checkInTime": "2024-01-16T08:45:00Z",
    "checkedIn": true,
    "remarks": "Slight delay"
  },
  {
    "id": 3,
    "studentId": 123,
    "date": "2024-01-17",
    "checkInTime": null,
    "checkedIn": false,
    "remarks": null
  }
]


To show the check-in status (true or false) from the SchoolCheckInAttendance and the corresponding ClassAttendance records for each student, you can achieve this by retrieving the relevant data through Prisma queries. Here's how you can structure the query:

Assuming you have a student's id and you want to fetch their check-in status from SchoolCheckInAttendance and their corresponding ClassAttendance records:
const studentId = 1; // Replace with the actual student's ID

const studentData = await prisma.student.findUnique({
  where: {
    id: studentId,
  },
  include: {
    SchoolCheckInAttendance: {
      where: {
        date: { gte: new Date().toISOString().split("T")[0] }, // Get today's date in "YYYY-MM-DD" format
      },
    },
    studentClassAssignment: {
      include: {
        ClassAttendance: {
          where: {
            date: { gte: new Date().toISOString().split("T")[0] }, // Get today's date in "YYYY-MM-DD" format
          },
        },
      },
    },
  },
});

console.log(studentData);
