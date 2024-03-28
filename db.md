My requirement is . The student will enroll to a subject in a term and not subjectGroup or the levels in a subject. The student should be able to enroll for multiple subjects across any
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



for context i will telll you how it workd briefly "My requirement is . The student will enroll to a subject in a term and not subjectGroup or the levels in a subject. The student should be able to enroll for multiple subjects across any
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
TermSubjectLevel, and a one-to-one relationship from TermSubjectLevel to SubjectEnrollment.   i have attendance. Now my requirement for attendance has changed in the folllowing way.
 ""Attendance is a two-step process. The admin will mark the 1st  attendance for ALL students, before going to the class after the admin makes the attendance, say at the entrance of the school, this is how the admin checks the students into the school. After this 1st attendance is marked or checked in,  the students are then sent to their respective classes, which is studentClassAssignment.
Now once they are in their respective classes, which is in the studentClassAssignment, in the DB/schema the teacher then proceeds to mark the 2nd  attendance for the students.
this is to ensure that all the students who marked 1st attendance or checked have gone to their classes and do not skip the class."

study the context clearly and be ready for my next questions. You are a senior data base postgress designer. DO not reply


My idea is to send consolidated emails for feedback  and homework.
So for that i have created model like model Feedback {
  id                 Int      @id @default(autoincrement())
  studentId          Int
  teacherId          Int
  termSubjectLevelId Int
  title              String
  content            String
  isSent             Boolean  @default(false)
  sendDate           DateTime @default(now())
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  student          Student          @relation(fields: [studentId], references: [id], onDelete: Cascade)
  teacher          Teacher          @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  termSubjectLevel TermSubjectLevel @relation(fields: [termSubjectLevelId], references: [id])

  // @@unique([studentId, teacherId, termSubjectLevelId, title]) // Ensuring uniqueness of the feedback
}

model GroupHomework {
  id                 Int      @id @default(autoincrement())
  studentId          Int
  teacherId          Int
  termSubjectLevelId Int
  title              String
  description        String
  attachments        String[] // URLs of the attached documents
  isSent             Boolean  @default(false)
  sendDate           DateTime @default(now())
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  student          Student          @relation(fields: [studentId], references: [id], onDelete: Cascade)
  teacher          Teacher          @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  termSubjectLevel TermSubjectLevel @relation(fields: [termSubjectLevelId], references: [id])

  // @@unique([studentId, teacherId, termSubjectLevelId, title]) // Ensuring uniqueness of the homework assignment
}

model AutomatedMailForParents {
  id                 Int      @id @default(autoincrement())
  studentId          Int
  teacherId          Int
  termSubjectLevelId Int
  sectionId          Int
  className          String
  roomName           String
  classTime          String
  isSent             Boolean  @default(false)
  sendDate           DateTime @default(now())
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  student          Student          @relation(fields: [studentId], references: [id], onDelete: Cascade)
  teacher          Teacher          @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  termSubjectLevel TermSubjectLevel @relation(fields: [termSubjectLevelId], references: [id])
  section          Section          @relation(fields: [sectionId], references: [id])

  @@unique([studentId, termSubjectLevelId, sectionId, sendDate])
}

so the requirement is when a teacher creates a feedback , a record in AutomatedMailForParents table is created and simultaneously creates a record in feedback table like export async function createFeedback(studentId: string, teacherId: string, termSubjectLevelId: string, sectionId: string, content: string, title: string, className: string, roomName: string, classTime:string) {
    const sendDate = getNextSundayAtFourThirty();

    // Create feedback
    const feedback = await db.feedback.create({
        data: {
            student: {
                connect: { id: +studentId }
            },
            teacher: {
                connect: { id: +teacherId }
            },
            termSubjectLevel: {
                connect: { id: +termSubjectLevelId }
            },
            content,
            title,
            sendDate,
            isSent: false
        }
    });

    // Check for existing AutomatedMailForParents record
    const existingAutomatedMail = await db.automatedMailForParents.findFirst({
        where: {
            studentId: +studentId,
            teacherId: +teacherId,
            termSubjectLevelId: +termSubjectLevelId,
            sectionId: +sectionId, // Assuming sectionId is part of your feedback model or derived somehow
            sendDate
        }
    });

    // Create AutomatedMailForParents record if it does not exist
    if (!existingAutomatedMail) {
        await db.automatedMailForParents.create({
            data: {
                studentId: +studentId,
                teacherId: +teacherId,
                termSubjectLevelId: +termSubjectLevelId,
                sectionId: +sectionId, // Assuming sectionId is part of your feedback model or derived somehow
                className,
                roomName,
                sendDate,
                isSent: false,
                classTime
            }
        });
    }

    return feedback;
}

so as you can see if an additional feedback is created for a student in a termSubjectLevelId and sectionID (where termSubjectLevelId + sectionID = class) , then we wont created additional automatedMailForParents record. It will only created a record in Feedback.

now Similarily , as far as homework is concerned,  the requirement is when a teacher creates a homework , a record in AutomatedMailForParents table is created , if it is not there and simultaneously creates a record in homework table like export async function createGroupHomework(
    studentId: string,
    teacherId: string,
    termSubjectLevelId: string,
    sectionId: string,
    title: string,
    description: string,
    attachments: string[],
    className: string,
    roomName: string,
    classTime: string
) {
    const sendDate = await getNextSundayAtFourThirty();

    const groupHomework = await db.groupHomework.create({
        data: {
            studentId: +studentId,
            teacherId: +teacherId,
            termSubjectLevelId: +termSubjectLevelId,
            title: title,
            description: description,
            attachments: attachments,
            isSent: false,
            sendDate: sendDate
        }
    });

    const existingAutomatedMail = await db.automatedMailForParents.findFirst({
        where: {
            studentId: +studentId,
            teacherId: +teacherId,
            termSubjectLevelId: +termSubjectLevelId,
            sectionId: +sectionId,
            sendDate: sendDate
        }
    });

    if (!existingAutomatedMail) {
        await db.automatedMailForParents.create({
            data: {
                studentId: +studentId,
                teacherId: +teacherId,
                termSubjectLevelId: +termSubjectLevelId,
                sectionId: +sectionId,
                className: className,
                roomName: roomName,
                sendDate: sendDate,
                isSent: false,
                classTime
            }
        });
    }

    return groupHomework;
}
so as you can see if an additional homework is created for a student in a termSubjectLevelId and sectionID (where termSubjectLevelId + sectionID = class) , then we wont created additional automatedMailForParents record. It will only created a record in Homwork.


so what you need to undertstand is that , I am using AutomatedMailForParents to track feedback or homeworks to be send to parents.
So Imagine if a teacher creates a feedback , a record for AutomatedMailForParents  is now created . now imagine the teacher creates a homework for the same termSubjectLevelId and sectionID (where termSubjectLevelId + sectionID = class) , then we wont created additional automatedMailForParents record. It will only created a record in Homwork.


_______________________


import { Request, Response, NextFunction } from 'express';
import { getPresignedUrl } from '../../../../service/fileUploadService'; // Import the service

export const generatePresignedUrlHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { filename, fileType } = req.query;

        if (!filename || !fileType) {
            return res.status(400).send('Filename and fileType are required');
        }

        const presignedUrlData = await getPresignedUrl(filename, fileType);
        res.status(200).json(presignedUrlData);
    } catch (error) {
        next(error); // Forward to error handling middleware
    }
};
import S3 from 'aws-sdk/clients/s3';
import { randomUUID } from 'crypto';

const s3 = new S3({
    apiVersion: "2006-03-01",
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
    region: process.env.REGION,
    signatureVersion: "v4",
});

export const getPresignedUrl = async (filename, fileType) => {
    const extension = fileType.split('/')[1];
    const Key = `${randomUUID()}.${extension}`;

    const s3Params = {
        Bucket: process.env.BUCKET_NAME,
        Key,
        Expires: 60,
        ContentType: fileType,
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', s3Params);
    return {
        uploadUrl,
        key: Key,
    };
};
import express from 'express';
import { protectRoute, restrict } from 'your-auth-middleware'; // Import your auth middleware
import { generatePresignedUrlHandler } from 'path-to-your-controller';

const router = express.Router();

// Add the new route for generating a presigned URL
router.get('/generate-presigned-url', protectRoute, restrict('ADMIN'), generatePresignedUrlHandler);

// ... other routes

export default router;


------------------
export const searchActiveStudentsHandler = async (req: Request<{}, {}, {}, SearchActiveStudentsSchema['query']>, res: Response, next: NextFunction) => {
    const { search, subjectOption, levelOption, sectionOption, page = 0, termId } = req.query;

    if (termId) {
        const searchResult = await searchActiveStudents(search, +page, +termId, subjectOption, levelOption, sectionOption);
        res.status(200).json(searchResult);
    }
};
--------------------
// search enrolled students
export const searchActiveStudentsSchema = z.object({
    query: z.object({
        search: z.string().optional(),
        subjectOption: z.string().optional(),
        levelOption: z.string().optional(),
        sectionOption: z.string().optional(),
        page: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional(),
        termId: z.string().min(1, { message: 'Atleast one param string value required @ksm' }).optional()
    })
});
export type SearchActiveStudentsSchema = z.infer<typeof searchActiveStudentsSchema>;

----------------------

// search active student for the admin
export async function searchActiveStudents(search = '', page: number, termId: number, subjectOption = '', levelOption = '', sectionOption = '') {
    const take = 10;

    const pageNum: number = page ?? 0;
    const skip = pageNum * take;
    const activeStudents = await db.student.findMany({
        skip,
        take,
        orderBy: {
            createdAt: 'desc'
        },
        where: {
            role: 'STUDENT',
            isActive: true,
            enrollments: {
                some: {
                    subjectEnrollment: {
                        termSubject: {
                            subject: { name: subjectOption }
                        }
                    },
                    termSubjectLevel: {
                        level: { name: levelOption ? levelOption : undefined },
                        sections: {
                            some: {
                                name: sectionOption ? sectionOption : undefined
                            }
                        }
                    }
                }
            },
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
            }
        }
    });
    const count = await db.student.count({
        where: {
            role: 'STUDENT',
            isActive: true,
            studentTermFee: {
                some: {
                    termId: +termId,
                    termSubjectGroup: {
                        subject: {
                            some: {
                                name: subjectOption
                            }
                        }
                    }
                }
            },
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

----------------
import { PrismaClient, customError } from '@prisma/client';

const db = new PrismaClient();

export async function createSchoolCheckInAttendanceForStudent(date: string) {
    if (!date) {
        throw customError('You need to provide a date to create School CheckIn Attendance record.', 'fail', 404, true);
    }

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const currentTerm = await db.term.findFirst({
        where: { currentTerm: true }
    });

    if (!currentTerm) {
        throw customError('No current term found.', 'fail', 404, true);
    }

    const activeStudents = await db.student.findMany({
        where: {
            role: 'STUDENT',
            isActive: true,
            studentTermFee: {
                some: { termId: currentTerm.id }
            }
        },
        include: {
            studentClassAssignment: {
                where: {
                    isCurrentlyAssigned: true
                }
            },
            personalDetails: true
        }
    });

    const existingRecords = await db.schoolCheckInAttendance.findMany({
        where: { date: { gte: startDate, lte: endDate } }
    });

    if (existingRecords.length > 0) {
        throw customError('Attendance already created for today.', 'fail', 400, true);
    }

    await db.$transaction(async (prisma) => {
        const createdAttendanceRecords = await prisma.schoolCheckInAttendance.createMany({
            data: activeStudents.map((student) => ({
                studentId: student.id,
                date: startDate,
                checkInTime: new Date()
            })),
            select: {
                id: true
            }
        });

        for (const student of activeStudents) {
            for (const assignment of student.studentClassAssignment) {
                const existingClassAttendance = await prisma.classAttendance.findUnique({
                    where: {
                        studentClassAssignmentId_date: {
                            studentClassAssignmentId: assignment.id,
                            date: startDate
                        }
                    }
                });

                if (!existingClassAttendance) {
                    await prisma.classAttendance.create({
                        data: {
                            studentClassAssignmentId: assignment.id,
                            date: startDate,
                            attendanceStatus: 'ABSENT',
                            // Here, match the schoolCheckInAttendanceId correctly
                            schoolCheckInAttendanceId: /* Determine the correct ID */
                        }
                    });
                }
            }
        }
    });

    return { message: 'Attendance records created successfully.' };
}


export async function sendConsolidatedEmail(recipient: string, subject: string, text: string, attachments: { filename: string, path: string }[]) {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '0'),
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    const validAttachments = attachments.filter(attachment => isValidHttpUrl(attachment.path));

    const emailAttachments = await Promise.all(validAttachments.map(async (attachment) => {
        // Download each file from S3 using the presigned URL
        const response = await axios.get(attachment.path, { responseType: 'stream' });
        const fileStream = response.data;

        // Stream to buffer conversion
        const finished = promisify(stream.finished);
        const chunks: Buffer[] = [];
        fileStream.on('data', (chunk: Buffer) => chunks.push(chunk));
        await finished(fileStream);
        return {
            filename: attachment.filename,
            content: Buffer.concat(chunks)
        };
    }));

    // Email options
    const emailOptions = {
        from: process.env.EMAIL_FROM,
        to: recipient,
        subject,
        text,
        attachments: emailAttachments
    };

    // Send email
    await transporter.sendMail(emailOptions);
}

function isValidHttpUrl(string) {
    let url;

    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }

    return url.protocol === "http:" || url.protocol === "https:";
}
{
throw customError('Mails are sent for today. Please assign feedback, Homework,Classwork on the next working day.', 'fail', 404, true);
        }



        async function fetchStudents({ subjectOption, termId, levelOption, sectionOption }) {
    // Construct the base query conditions
    let queryConditions = {
        role: 'STUDENT',
        isActive: true,
        enrollments: {
            some: {
                subjectEnrollment: {
                    isNot: null
                }
            }
        }
    };

    // Add conditions for subject and term
    if (subjectOption) {
        queryConditions.enrollments.some.subjectEnrollment = {
            ...queryConditions.enrollments.some.subjectEnrollment,
            termSubject: {
                subjectId: +subjectOption
            }
        };
    }

    if (termId) {
        queryConditions.enrollments.some.subjectEnrollment.termSubject = {
            ...queryConditions.enrollments.some.subjectEnrollment.termSubject,
            termId: termId
        };
    }

    // Add condition for level
    if (levelOption) {
        queryConditions.enrollments.some.termSubjectLevel = {
            levelId: levelOption
        };
    }

    // Add condition for section
    if (sectionOption) {
        queryConditions.enrollments.some.termSubjectLevel.sections = {
            some: {
                id: sectionOption
            }
        };
    }

    // Execute the query using Prisma
    const students = await prisma.student.findMany({
        where: queryConditions,
        include: {
            enrollments: {
                include: {
                    subjectEnrollment: {
                        include: {
                            termSubject: true
                        }
                    },
                    termSubjectLevel: {
                        include: {
                            sections: true
                        }
                    }
                }
            }
        }
    });

    return students;
}

// Example usage
fetchStudents({
    subjectOption: '1',  // Example subject ID
    termId: '2022',      // Example term ID
    levelOption: '1',    // Example level ID
    sectionOption: '1'   // Example section ID
}).then(students => {
    console.log(students);
}).catch(error => {
    console.error('Error fetching students:', error);
});


export async function findUnassignedStudents() {
    // Find all students with enrollments, including their class assignments
    const enrolledStudents = await db.enrollment.findMany({
        include: {
            student: true,
            studentClassAssignments: true // Includes related class assignments
        }
    });

    // Filter out students who have a class assignment
    const unassignedStudents = enrolledStudents.filter(enrollment => {
        // Check if the student has no class assignments
        return enrollment.studentClassAssignments.length === 0;
    }).map(enrollment => enrollment.student); // Extract student details

    return unassignedStudents;
}


*********************************
ok , using that schema the way i create logic is by using route, controller , schema and service where route is
adminEnrollmentRoute.route('/enroll-applicant-to-student/:id').post(validate(findUniqueApplicantSchema), protectRoute, restrict('ADMIN'),asyncErrorHandler(enrollApplicantToStudentHandler));

and controller is export const enrollApplicantToStudentHandler = async (req: Request<FindUniqueApplicantSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const enrolledSubjects = await enrollApplicantToStudent(+id);
    res.status(200).json(enrolledSubjects);
};
 and schema is export const findUniqueApplicantSchema = z.object({
    params: z.object({
        id: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});

export type FindUniqueApplicantSchema = z.infer<typeof findUniqueApplicantSchema>; and service is export async function enrollApplicantToStudent(id: number) {
    // Fetch the student record
    const student = await db.student.findUnique({
        where: { id }
    });

    // Check if student record exists
    if (!student) {
        throw customError(`No student found with ID ${id}`, 'fail', 404, true);
    }
    const enrollments = await db.enrollment.findMany({
        where: { studentId: id }
    });

    if (enrollments.length === 0) {
        throw customError(`No enrollments found for the applicant. Please enroll a subject at the subject & classes tab.`, 'fail', 404, true);
    }

    // Check if the student's role is already 'STUDENT'
    if (student.role === 'STUDENT') {
        throw customError(`The applicant is already a student`, 'fail', 404, true);
    }

    // Update the student's role to 'STUDENT'
    await db.student.update({
        where: { id },
        data: { role: 'STUDENT' }
    });

    return { message: `The applicant enrolled to Student successfully` };
}