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



study my schema as you are a senior database and backend engineer. Wait for my questions and do not reply


------------------------------



generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  TEACHER
  APPLICANT
  WAITLISTED
  STUDENT
  ALUMNI
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  EXCUSED
  LATE
  LEAVE
}

enum LeaveStatus {
  PENDING
  APPROVED
  DECLINED
}

enum PaymentMethod {
  ONLINE
  SCHOOL
  NA
  DISCOUNT
}

enum PaymentStatus {
  PENDING
  PAID
  NODUES
  DUE
  OVERDUE
}

enum PaymentType {
  MONTHLY
  TERM
}

model Student {
  id                           Int                            @id @default(autoincrement())
  akaalId                      Int?
  attendancePercentageValue    Int                            @default(0)
  termAttendance               Int                            @default(0)
  role                         Role                           @default(APPLICANT)
  isActive                     Boolean                        @default(false)
  isAllowedLogin               Boolean                        @default(false)
  enrollments                  Enrollment[]
  personalDetails              PersonalDetails?
  parentsDetails               ParentsDetails?
  emergencyContact             EmergencyContact?
  healthInformation            HealthInformation?
  otherInformation             OtherInformation?
  studentTermFee               StudentTermFee[]
  subjectsChosen               String[]                       @default(["Subjects Chosen Not available"])
  subjectRelated               String[]                       @default(["Options Not available"])
  createdAt                    DateTime                       @default(now())
  updatedAt                    DateTime                       @updatedAt
  studentClassAssignment       StudentClassAssignment[]
  user                         User?
  schoolCheckInAttendance      SchoolCheckInAttendance[]
  skipReport                   SkipReport[]
  feedback                     Feedback[]
  interaction                  Interaction[]
  comment                      Comment[]
  GroupHomework                GroupHomework[]
  AutomatedMailForParents      AutomatedMailForParents[]
  GroupClasswork               GroupClasswork[]
  Leave                        Leave[]
  StudentNoticeAcknowledgement StudentNoticeAcknowledgement[]
  hasOverDue                   Boolean                        @default(false) // Indicates if there is any overdue amount
  overDue                      Int                            @default(0) // Amount overdue for payment
  currentInvoiceDue            Int                            @default(0)
}

model PersonalDetails {
  id        Int      @id @default(autoincrement())
  studentId Int      @unique
  firstName String
  lastName  String
  DOB       DateTime
  gender    String
  email     String
  contact   String
  address   String
  suburb    String
  state     String
  country   String   @default("Australia")
  postcode  String
  image     String?
  student   Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
}

model ParentsDetails {
  id            Int     @id @default(autoincrement())
  fatherName    String
  motherName    String
  parentEmail   String
  parentContact String
  studentId     Int     @unique
  student       Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
}

model EmergencyContact {
  id            Int     @id @default(autoincrement())
  contactPerson String  @default("Not given")
  contactNumber String
  relationship  String
  studentId     Int     @unique
  student       Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
}

model HealthInformation {
  id                        Int     @id @default(autoincrement())
  medicareNumber            String? @default("Medicare Number not provided")
  ambulanceMembershipNumber String?
  medicalCondition          String
  allergy                   String
  studentId                 Int     @unique
  student                   Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
}

model OtherInformation {
  id          Int      @id @default(autoincrement())
  otherInfo   String   @default("No information provided")
  declaration String[] @default([""])
  studentId   Int      @unique
  student     Student? @relation(fields: [studentId], references: [id], onDelete: Cascade)
}

model Subject {
  id                      Int                       @id @default(autoincrement())
  name                    String                    @unique
  isActive                Boolean                   @default(true)
  termSubject             TermSubject[]
  termSubjectGroupSubject TermSubjectGroupSubject[]
  termSubjectGroup        TermSubjectGroup[]
  termSubjectLevel        TermSubjectLevel[]
  TeacherSubject          TeacherSubject[]
  Homework                Homework[]
  Classwork               Classwork[]
}

model SubjectGroup {
  id                      Int                       @id @default(autoincrement())
  isActive                Boolean                   @default(true)
  groupName               String                    @unique
  termSubjectGroup        TermSubjectGroup[]
  termSubjectGroupSubject TermSubjectGroupSubject[]
}

model Term {
  id                      Int                       @id @default(autoincrement())
  isPublish               Boolean                   @default(false)
  currentTerm             Boolean                   @default(false)
  name                    String                    @unique
  startDate               DateTime
  endDate                 DateTime
  createdAt               DateTime                  @default(now())
  updatedAt               DateTime                  @updatedAt
  termSubject             TermSubject[]
  termSubjectGroup        TermSubjectGroup[]
  termSubjectGroupSubject TermSubjectGroupSubject[]
  studentTermFee          StudentTermFee[]
  termSubjectLevel        TermSubjectLevel[]
  FeeDashboard            FeeDashboard[]
  FeeTemplate             FeeTemplate[]
}

model Level {
  id               Int                @id @default(autoincrement())
  isActive         Boolean            @default(true)
  name             String             @unique
  termSubject      TermSubject[]
  TermSubjectLevel TermSubjectLevel[]
}

model Section {
  id                      Int                       @id @default(autoincrement())
  name                    String                    @unique
  termSubjectLevel        TermSubjectLevel[]
  StudentClassAssignment  StudentClassAssignment[]
  TeacherClassAssignment  TeacherClassAssignment[]
  AutomatedMailForParents AutomatedMailForParents[]
  Homework                Homework[]
  Classwork               Classwork[]
  GroupHomework           GroupHomework[]
  GroupClasswork          GroupClasswork[]
  TimetableSlot           TimetableSlot[]
}

model TermSubjectGroup {
  id                      Int                       @id @default(autoincrement())
  termId                  Int
  feeId                   Int?
  subjectGroupId          Int
  fee                     Fee?                      @relation(fields: [feeId], references: [id], onDelete: Cascade)
  term                    Term                      @relation(fields: [termId], references: [id], onDelete: Cascade)
  subjectGroup            SubjectGroup              @relation(fields: [subjectGroupId], references: [id])
  enrollment              Enrollment[]
  subject                 Subject[]
  termSubject             TermSubject[]
  termSubjectGroupSubject TermSubjectGroupSubject[]
  studentTermFee          StudentTermFee[]
  FeeTemplate             FeeTemplate[]

  @@unique([termId, subjectGroupId])
}

model TermSubject {
  id                 Int                 @id @default(autoincrement())
  termSubjectGroupId Int
  subjectId          Int
  termId             Int
  isOnSunday         Boolean             @default(false)
  isOnWeekday        Boolean             @default(false)
  level              Level[]
  subject            Subject             @relation(fields: [subjectId], references: [id])
  subjectEnrollments SubjectEnrollment[]
  term               Term                @relation(fields: [termId], references: [id], onDelete: Cascade)
  termSubjectGroup   TermSubjectGroup    @relation(fields: [termSubjectGroupId], references: [id])

  @@unique([termId, subjectId, termSubjectGroupId])
}

model TermSubjectLevel {
  id                      Int                       @id @default(autoincrement())
  termId                  Int
  subjectId               Int
  levelId                 Int
  sections                Section[]
  term                    Term                      @relation(fields: [termId], references: [id])
  subject                 Subject                   @relation(fields: [subjectId], references: [id])
  level                   Level                     @relation(fields: [levelId], references: [id])
  enrollments             Enrollment[]
  studentClassAssignment  StudentClassAssignment[]
  teacherClassAssignment  TeacherClassAssignment[]
  Feedback                Feedback[]
  GroupHomework           GroupHomework[]
  AutomatedMailForParents AutomatedMailForParents[]
  GroupClasswork          GroupClasswork[]
  Classwork               Classwork[]
  Homework                Homework[]
  TimetableSlot           TimetableSlot[]

  @@unique([termId, subjectId, levelId])
}

model StudentClassAssignment {
  id                  Int               @id @default(autoincrement())
  enrollmentId        Int
  studentId           Int
  termSubjectLevelId  Int
  sectionId           Int
  isCurrentlyAssigned Boolean           @default(true)
  changeDate          DateTime          @default(now())
  note                String? // Optional field for notes
  enrollment          Enrollment        @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  student             Student           @relation(fields: [studentId], references: [id], onDelete: Cascade)
  termSubjectLevel    TermSubjectLevel  @relation(fields: [termSubjectLevelId], references: [id], onDelete: Cascade)
  section             Section           @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  classAttendance     ClassAttendance[]

  @@unique([studentId, termSubjectLevelId, isCurrentlyAssigned, sectionId])
}

model Enrollment {
  id                      Int                       @id @default(autoincrement())
  studentId               Int
  dueDate                 DateTime?
  termSubjectGroupId      Int
  subjectEnrollmentId     Int?                      @unique
  createdAt               DateTime                  @default(now())
  termSubjectLevelId      Int?
  student                 Student                   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  termSubjectGroup        TermSubjectGroup          @relation(fields: [termSubjectGroupId], references: [id])
  termSubjectGroupSubject TermSubjectGroupSubject[]
  subjectEnrollment       SubjectEnrollment?
  termSubjectLevel        TermSubjectLevel?         @relation(fields: [termSubjectLevelId], references: [id])
  studentClassAssignment  StudentClassAssignment[]

  @@unique([studentId, termSubjectGroupId, subjectEnrollmentId])
}

model SubjectEnrollment {
  id            Int         @id @default(autoincrement())
  enrollmentId  Int         @unique
  termSubjectId Int
  grade         String      @default("No Grades yet") // Optional, for storing grades
  enrollment    Enrollment  @relation(fields: [enrollmentId], references: [id])
  termSubject   TermSubject @relation(fields: [termSubjectId], references: [id])

  @@unique([enrollmentId, termSubjectId])
}

model Fee {
  id               Int                @id @default(autoincrement())
  amount           Int
  paymentType      PaymentType
  termSubjectGroup TermSubjectGroup[]

  @@unique([amount, paymentType])
}

model StudentTermFee {
  id                 Int              @id @default(autoincrement())
  studentId          Int
  termSubjectGroupId Int
  termId             Int
  feePayment         FeePayment[]
  student            Student          @relation(fields: [studentId], references: [id])
  termSubjectGroup   TermSubjectGroup @relation(fields: [termSubjectGroupId], references: [id])
  term               Term             @relation(fields: [termId], references: [id])
  createdAt          DateTime         @default(now())

  @@unique([studentId, termSubjectGroupId, termId])
}

model PaymentInstallment {
  id            Int           @id @default(autoincrement())
  feePaymentId  Int
  paidAmount    Int           @default(0)
  paidDate      DateTime?
  paymentMethod PaymentMethod @default(NA)
  paymentStatus PaymentStatus @default(PENDING)
  remarks       String        @default("No remarks")
  receivedBy    String?
  feePayment    FeePayment    @relation(fields: [feePaymentId], references: [id])

  @@index([feePaymentId])
}

model FeePayment {
  id                  Int                  @id @default(autoincrement())
  invoiceId           String // combination fo studentId_01
  feeTemplateId       Int
  dueDate             DateTime
  dueAmount           Int // Amount still due (if any)
  creditAmount        Int                  @default(0)
  feeAmount           Int
  studentTermFeeId    Int
  hasDiscount         Boolean              @default(false)
  hasOverDue          Boolean              @default(false)
  hasDue              Boolean              @default(true)
  isActive            Boolean              @default(true)
  adjustedFeeAmount   Int                   // Fee amount after discount or adjustment
  discountAmount      Int                  @default(0) // Amount of discount applied
  discountReason      String? // Reason for the discount
  paymentStatus       PaymentStatus        @default(PENDING)
  studentTermFee      StudentTermFee?      @relation(fields: [studentTermFeeId], references: [id], onDelete: Cascade)
  feeTemplate         FeeTemplate?         @relation(fields: [feeTemplateId], references: [id], onDelete: Cascade)
  updatedAt           DateTime?            @updatedAt
  createdAt           DateTime             @default(now())
  paymentInstallments PaymentInstallment[]
}

model FeeTemplate {
  id                 Int               @id @default(autoincrement())
  invoiceName        String
  groupName          String
  month              String
  year               String
  termName           String
  amount             Int
  dueDate            DateTime
  notes              String
  interval           PaymentType
  feePayments        FeePayment[]
  termId             Int? // Optional link to Term
  termSubjectGroupId Int? // Optional link to TermSubjectGroup
  term               Term?             @relation(fields: [termId], references: [id])
  termSubjectGroup   TermSubjectGroup? @relation(fields: [termSubjectGroupId], references: [id])
  updatedAt          DateTime          @updatedAt
  createdAt          DateTime          @default(now())
}

model FeeDashboard {
  id                   Int      @id @default(autoincrement())
  totalFeesInvoiced    Int      @default(0)
  totalFeesPaid        Int      @default(0)
  totalFeesDue         Int      @default(0)
  totalFeesOverdue     Int      @default(0)
  totalFeesOverduePrev Int      @default(0)
  termId               Int // Link to the term if these values are specific to a term
  updatedAt            DateTime @updatedAt
  createdAt            DateTime @default(now())
  term                 Term     @relation(fields: [termId], references: [id])

  @@unique([termId, createdAt]) // Assuming you want unique records per term and snapshot
}

model TermSubjectGroupSubject {
  id                 Int               @id @default(autoincrement())
  termId             Int
  subjectGroupId     Int
  termSubjectGroupId Int?
  enrollmentId       Int?
  subjectId          Int
  term               Term              @relation(fields: [termId], references: [id], onDelete: Cascade)
  subjectGroup       SubjectGroup      @relation(fields: [subjectGroupId], references: [id])
  subject            Subject           @relation(fields: [subjectId], references: [id])
  termSubjectGroup   TermSubjectGroup? @relation(fields: [termSubjectGroupId], references: [id], onDelete: Cascade)
  enrollment         Enrollment?       @relation(fields: [enrollmentId], references: [id])

  @@unique([termId, subjectGroupId, subjectId])
}

model TimeTable {
  id         Int      @id @default(autoincrement())
  name       String?  @default("Timetable")
  termId     Int?
  roomNames  String[] @default([])
  isActive   Boolean  @default(true)
  data       Json
  totalRooms Int      @default(6)
  updatedAt  DateTime @updatedAt
  createdAt  DateTime @default(now())
}

model Teacher {
  id                               Int                               @id @default(autoincrement())
  role                             Role                              @default(APPLICANT)
  isActive                         Boolean                           @default(false)
  isAllowedLogin                   Boolean                           @default(false)
  teacherPersonalDetails           TeacherPersonalDetails?
  teacherEmergencyContact          TeacherEmergencyContact?
  teacherWWCHealthInformation      TeacherWWCHealthInformation?
  teacherWorkRights                TeacherWorkRights?
  teacherQualificationAvailability TeacherQualificationAvailability?
  teacherBankDetails               TeacherBankDetails?
  teacherOtherInformation          TeacherOtherInformation?
  teacherSubject                   TeacherSubject[]
  teacherSubjectAssignment         TeacherClassAssignment[]
  createdAt                        DateTime                          @default(now())
  updatedAt                        DateTime                          @updatedAt
  user                             User?
  skipReport                       SkipReport[]
  Homework                         Homework[]
  feedback                         Feedback[]
  GroupHomework                    GroupHomework[]
  AutomatedMailForParents          AutomatedMailForParents[]
  Classwork                        Classwork[]
  GroupClasswork                   GroupClasswork[]
  NoticeAcknowledgement            NoticeAcknowledgement[]
  TimetableSlot                    TimetableSlot[]
}

model TeacherPersonalDetails {
  id        Int      @id @default(autoincrement())
  teacherId Int      @unique
  firstName String
  lastName  String
  DOB       DateTime
  gender    String
  email     String   @unique
  contact   String
  address   String
  suburb    String
  state     String
  country   String
  postcode  String
  image     String?
  teacher   Teacher  @relation(fields: [teacherId], references: [id], onDelete: Cascade)
}

model TeacherEmergencyContact {
  id            Int     @id @default(autoincrement())
  teacherId     Int     @unique
  contactPerson String
  contactNumber String
  relationship  String
  teacher       Teacher @relation(fields: [teacherId], references: [id], onDelete: Cascade)
}

model TeacherWWCHealthInformation {
  id                                     Int      @id @default(autoincrement())
  teacherId                              Int      @unique
  medicareNumber                         String?  @default("Medicare Number not provided")
  medicalCondition                       String
  childrenCheckCardNumber                String   @unique
  workingWithChildrenCheckExpiry         DateTime
  workingwithChildrenCheckCardPhotoImage String?
  teacher                                Teacher  @relation(fields: [teacherId], references: [id], onDelete: Cascade)
}

model TeacherWorkRights {
  id                Int     @id @default(autoincrement())
  teacherId         Int     @unique
  workRights        Boolean
  immigrationStatus String
  teacher           Teacher @relation(fields: [teacherId], references: [id], onDelete: Cascade)
}

model TeacherQualificationAvailability {
  id              Int      @id @default(autoincrement())
  teacherId       Int      @unique
  qualification   String
  experience      String
  subjectsChosen  String[]
  timeSlotsChosen String[]
  teacher         Teacher  @relation(fields: [teacherId], references: [id], onDelete: Cascade)
}

model TeacherBankDetails {
  id              Int     @id @default(autoincrement())
  teacherId       Int     @unique
  bankAccountName String
  BSB             String
  accountNumber   String
  ABN             String? @default("NA")
  teacher         Teacher @relation(fields: [teacherId], references: [id], onDelete: Cascade)
}

model TeacherOtherInformation {
  id        Int     @id @default(autoincrement())
  teacherId Int     @unique
  otherInfo String  @default("No information provided")
  teacher   Teacher @relation(fields: [teacherId], references: [id], onDelete: Cascade)
}

model TeacherSubject {
  id        Int     @id @default(autoincrement())
  teacherId Int
  subjectId Int
  teacher   Teacher @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  subject   Subject @relation(fields: [subjectId], references: [id])

  @@unique([teacherId, subjectId])
}

model TeacherClassAssignment {
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

model Admin {
  id                        Int                        @id @default(autoincrement())
  role                      Role                       @default(ADMIN)
  isActive                  Boolean                    @default(true)
  isAllowedLogin            Boolean                    @default(true)
  adminPersonalDetails      AdminPersonalDetails?
  adminEmergencyContact     AdminEmergencyContact?
  adminWWCHealthInformation AdminWWCHealthInformation?
  adminWorkRights           AdminWorkRights?
  adminBankDetails          AdminBankDetails?
  adminOtherInformation     AdminOtherInformation?
  createdAt                 DateTime                   @default(now())
  updatedAt                 DateTime                   @updatedAt
  user                      User?
  Homework                  Homework[]
  comment                   Comment[]
  Classwork                 Classwork[]
  SkipReport                SkipReport[]
  Leave                     Leave[]
  EmailTemplate             EmailTemplate[]
  Notice                    Notice[]
  StudentNotice             StudentNotice[]
}

model AdminPersonalDetails {
  id        Int      @id @default(autoincrement())
  adminId   Int      @unique
  firstName String
  lastName  String
  DOB       DateTime
  gender    String
  email     String   @unique
  contact   String   @unique
  address   String
  suburb    String
  state     String
  country   String
  postcode  String
  image     String?
  admin     Admin    @relation(fields: [adminId], references: [id], onDelete: Cascade)
}

model AdminEmergencyContact {
  id            Int    @id @default(autoincrement())
  adminId       Int    @unique
  contactPerson String
  contactNumber String
  relationship  String
  admin         Admin  @relation(fields: [adminId], references: [id], onDelete: Cascade)
}

model AdminWWCHealthInformation {
  id                                     Int      @id @default(autoincrement())
  adminId                                Int      @unique
  medicareNumber                         String?  @default("Medicare Number not provided")
  medicalCondition                       String
  childrenCheckCardNumber                String   @unique
  workingWithChildrenCheckExpiry         DateTime
  workingwithChildrenCheckCardPhotoImage String?
  admin                                  Admin    @relation(fields: [adminId], references: [id], onDelete: Cascade)
}

model AdminWorkRights {
  id                Int     @id @default(autoincrement())
  adminId           Int     @unique
  workRights        Boolean
  immigrationStatus String
  admin             Admin   @relation(fields: [adminId], references: [id], onDelete: Cascade)
}

model AdminBankDetails {
  id              Int     @id @default(autoincrement())
  adminId         Int     @unique
  bankAccountName String
  BSB             String
  accountNumber   String
  ABN             String? @default("NA")
  admin           Admin   @relation(fields: [adminId], references: [id], onDelete: Cascade)
}

model AdminOtherInformation {
  id        Int    @id @default(autoincrement())
  adminId   Int    @unique
  otherInfo String @default("No information provided")
  admin     Admin  @relation(fields: [adminId], references: [id], onDelete: Cascade)
}

model User {
  id                          Int      @id @default(autoincrement())
  email                       String   @unique
  password                    String
  role                        Role
  adminId                     Int?     @unique
  teacherId                   Int?     @unique
  studentId                   Int?     @unique
  admin                       Admin?   @relation(fields: [adminId], references: [id], onDelete: Cascade)
  teacher                     Teacher? @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  student                     Student? @relation(fields: [studentId], references: [id], onDelete: Cascade)
  createdAt                   DateTime @default(now())
  updatedAt                   DateTime @updatedAt
  isActive                    Boolean  @default(true)
  isEmailVerified             Boolean  @default(false)
  resetPasswordToken          String?
  resetPasswordTokenExpiresAt Int?
}

model SchoolCheckInAttendance {
  id              Int               @id @default(autoincrement())
  studentId       Int
  isMarked        Boolean           @default(false)
  date            DateTime // The date of check-in
  checkInTime     DateTime? // Nullable field for the time of check-in
  checkedIn       Boolean           @default(false) // Default to false to indicate not checked in initially
  isCheckedOut    Boolean? // Optional field to track whether the student is checked out
  checkOutTime    DateTime?
  remarks         String? // Optional field for notes
  isOnLeave       Boolean           @default(false)
  attendanceValue Int               @default(0)
  student         Student           @relation(fields: [studentId], references: [id], onDelete: Cascade)
  classAttendance ClassAttendance[]
  SchoolDay       SchoolDay?        @relation(fields: [schoolDayId], references: [id])
  schoolDayId     Int?

  @@unique([studentId, date]) // Ensuring uniqueness for check-in entry per student per day
}

model ClassAttendance {
  id                        Int                     @id @default(autoincrement())
  studentClassAssignmentId  Int
  schoolCheckInAttendanceId Int
  date                      DateTime // The date creating record
  schoolDayId               Int?
  remarks                   String?                 @default("NA") // Optional field for any notes
  attendanceStatus          AttendanceStatus        @default(ABSENT) // Enum for presence, absence, etc.
  schoolCheckInAttendance   SchoolCheckInAttendance @relation(fields: [schoolCheckInAttendanceId], references: [id])
  studentClassAssignment    StudentClassAssignment  @relation(fields: [studentClassAssignmentId], references: [id], onDelete: Cascade)
  SchoolDay                 SchoolDay?              @relation(fields: [schoolDayId], references: [id])

  @@unique([studentClassAssignmentId, date]) // Ensuring uniqueness for attendance entry per class per day
}

model SkipReport {
  id                  Int       @id @default(autoincrement())
  studentId           Int
  teacherId           Int?
  adminId             Int?
  date                DateTime
  reason              String
  isClosed            Boolean   @default(false)
  adminClosingRemarks String?
  className           String
  closeDate           DateTime?
  admin               Admin?    @relation(fields: [adminId], references: [id], onDelete: Cascade)
  teacher             Teacher?  @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  student             Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime? @updatedAt
}

model Homework {
  id                 Int               @id @default(autoincrement())
  subjectId          Int
  teacherId          Int? // Optional: ID of the teacher who uploaded the homework
  adminId            Int? // Optional: ID of the admin who uploaded the homework
  termSubjectLevelId Int?
  sectionId          Int?
  uploadedUserRole   String // Role of the uploader ('teacher' or 'admin')
  title              String?           @default("No title")
  description        String
  attachments        String[] // URLs of the attached documents
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt
  subject            Subject           @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  teacher            Teacher?          @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  admin              Admin?            @relation(fields: [adminId], references: [id], onDelete: Cascade)
  termSubjectLevel   TermSubjectLevel? @relation(fields: [termSubjectLevelId], references: [id])
  section            Section?          @relation(fields: [sectionId], references: [id])

  // @@unique([subjectId, title])
  HomeworkSnapshot     HomeworkSnapshot[]
  SentHomeworkSnapshot SentHomeworkSnapshot[]
}

model Feedback {
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
  sectionId          Int?
  title              String
  description        String[]
  attachments        String[] // URLs of the attached documents
  isSent             Boolean  @default(false)
  sendDate           DateTime @default(now())
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  student              Student                @relation(fields: [studentId], references: [id], onDelete: Cascade)
  teacher              Teacher                @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  section              Section?               @relation(fields: [sectionId], references: [id])
  termSubjectLevel     TermSubjectLevel       @relation(fields: [termSubjectLevelId], references: [id])
  HomeworkSnapshot     HomeworkSnapshot[]
  SentHomeworkSnapshot SentHomeworkSnapshot[]
}

model HomeworkSnapshot {
  id              Int           @id @default(autoincrement())
  homeworkId      Int // Foreign key to Homework
  groupHomeworkId Int // Foreign key to GroupHomework
  description     String
  attachments     String[]
  fileNames       String[]
  sendDate        DateTime      @default(now())
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  homework        Homework      @relation(fields: [homeworkId], references: [id], onDelete: Cascade)
  groupHomework   GroupHomework @relation(fields: [groupHomeworkId], references: [id], onDelete: Cascade)
}

model SentHomeworkSnapshot {
  id              Int      @id @default(autoincrement())
  homeworkId      Int? // Foreign key to Homework
  groupHomeworkId Int // Foreign key to GroupHomework
  description     String // Snapshot description at the time of sending
  attachments     String[] // Snapshot attachments at the time of sending
  fileNames       String[] // Snapshot filenames at the time of sending
  sendDate        DateTime // Date when the snapshot was sent
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relationships
  homework      Homework?     @relation(fields: [homeworkId], references: [id], onDelete: SetNull)
  groupHomework GroupHomework @relation(fields: [groupHomeworkId], references: [id])
}

model Classwork {
  id                 Int               @id @default(autoincrement())
  subjectId          Int
  teacherId          Int? // ID of the teacher who created the classwork
  adminId            Int?
  termSubjectLevelId Int?
  sectionId          Int?
  uploadedUserRole   String // Role of the uploader ('teacher' or 'admin')
  title              String?           @default("No title")
  description        String
  attachments        String[]
  dueDate            DateTime          @default(now())
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt
  termSubjectLevel   TermSubjectLevel? @relation(fields: [termSubjectLevelId], references: [id])
  subject            Subject           @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  teacher            Teacher?          @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  admin              Admin?            @relation(fields: [adminId], references: [id], onDelete: Cascade)
  section            Section?          @relation(fields: [sectionId], references: [id])

  // @@unique([subjectId, title])
  ClassworkSnapshot     ClassworkSnapshot[]
  SentClassworkSnapshot SentClassworkSnapshot[]
}

model GroupClasswork {
  id                 Int      @id @default(autoincrement())
  studentId          Int
  teacherId          Int
  termSubjectLevelId Int
  sectionId          Int?
  title              String
  description        String[]
  attachments        String[] // URLs of the attached documents
  isSent             Boolean  @default(false)
  sendDate           DateTime @default(now())
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  student          Student          @relation(fields: [studentId], references: [id], onDelete: Cascade)
  teacher          Teacher          @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  section          Section?         @relation(fields: [sectionId], references: [id])
  termSubjectLevel TermSubjectLevel @relation(fields: [termSubjectLevelId], references: [id])

  // @@unique([termSubjectLevelId, title])
  ClassworkSnapshot     ClassworkSnapshot[]
  SentClassworkSnapshot SentClassworkSnapshot[]
}

model ClassworkSnapshot {
  id               Int            @id @default(autoincrement())
  classworkId      Int // Foreign key to Homework
  groupClassworkId Int // Foreign key to GroupHomework
  description      String
  attachments      String[]
  fileNames        String[]
  sendDate         DateTime       @default(now())
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  classwork        Classwork      @relation(fields: [classworkId], references: [id], onDelete: Cascade)
  groupClasswork   GroupClasswork @relation(fields: [groupClassworkId], references: [id], onDelete: Cascade)
}

model SentClassworkSnapshot {
  id               Int      @id @default(autoincrement())
  classworkId      Int? // Foreign key to Classwork
  groupClassworkId Int // Foreign key to GroupClasswork
  description      String // Snapshot description at the time of sending
  attachments      String[] // Snapshot attachments at the time of sending
  fileNames        String[] // Snapshot filenames at the time of sending
  sendDate         DateTime // Date when the snapshot was sent
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // Relationships
  classwork      Classwork?     @relation(fields: [classworkId], references: [id], onDelete: SetNull)
  groupClasswork GroupClasswork @relation(fields: [groupClassworkId], references: [id])
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

  @@unique([studentId, termSubjectLevelId, sectionId, sendDate, teacherId])
}

enum InteractionType {
  EMAIL
  MEETING
  PHONE_CALL
  MESSAGE
  CONFERENCE
  OTHER
  AUTOMATED_EMAIL
}

model Interaction {
  id              Int             @id @default(autoincrement())
  studentId       Int // Foreign key reference to Student model
  interactionType InteractionType // Enum for interaction type
  description     String?         @default("No comments") // Optional detailed description of the interaction
  contactedDate   DateTime // Date and time of the interaction
  createdBy       Int // ID of the staff member who recorded the interaction
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  student         Student         @relation(fields: [studentId], references: [id])
  // Optionally include a relation to the staff or teacher who created the interaction
  // staff         Staff           @relation(fields: [createdBy], references: [id])
}

model Comment {
  id              Int             @id @default(autoincrement())
  studentId       Int // Foreign key reference to the Student model
  content         String // The text content of the comment
  interactionType InteractionType
  createdBy       Int // ID of the admin who created the comment
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  student         Student         @relation(fields: [studentId], references: [id])
  admin           Admin           @relation(fields: [createdBy], references: [id])
}

model Institution {
  id               Int      @id @default(autoincrement())
  name             String
  address          String
  logo             String // URL to the logo image, optional
  contact          String
  contactSecondary String
  contactTertiary  String
  email            String
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // You can add other fields or relationships as required
}

model SchoolDay {
  id                 Int                       @id @default(autoincrement())
  schoolOperatedDate DateTime // The date the school operated
  schoolAttendances  SchoolCheckInAttendance[] // Relationship with SchoolCheckInAttendance
  classAttendances   ClassAttendance[] // Relationship with ClassAttendance
  isOnSunday         Boolean                   @default(true)
  isOnWeekday        Boolean                   @default(false)
  createdAt          DateTime                  @default(now())
  updatedAt          DateTime                  @updatedAt

  // You might want to add additional fields like notes or special events on that day
}

model Leave {
  id            Int         @id @default(autoincrement())
  studentId     Int // Foreign key reference to Student
  appliedById   Int // ID of the person (admin/student) who applied for the leave
  appliedByRole Role
  startDate     DateTime // Start date of the leave
  endDate       DateTime // End date of the leave
  reason        String // Reason for the leave
  status        LeaveStatus @default(PENDING) // Status of the leave request
  appliedOn     DateTime    @default(now()) // Date when the leave was applied for
  approvedOn    DateTime? // Date when the leave was approved, nullable for pending leaves
  approverId    Int? // ID of the admin/teacher who approved the leave, nullable for pending leaves
  comments      String? // Optional comments about the leave request

  student   Student  @relation(fields: [studentId], references: [id])
  approver  Admin?   @relation(fields: [approverId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([studentId, startDate, endDate]) // Ensuring a student doesn't have overlapping leaves
}

model EmailTemplate {
  id          Int      @id @default(autoincrement())
  name        String // A unique name for identifying the template
  description String? // An optional description of the template
  subject     String // The subject line of the email
  text        String // The body text of the email template
  adminId     Int // Foreign key to reference the admin who created the template
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  admin       Admin    @relation(fields: [adminId], references: [id]) // Relation to the Admin model
}

model Notice {
  id               Int                     @id @default(autoincrement())
  title            String
  content          String
  adminId          Int
  createdAt        DateTime                @default(now())
  updatedAt        DateTime                @updatedAt
  admin            Admin                   @relation(fields: [adminId], references: [id])
  acknowledgements NoticeAcknowledgement[]
}

model NoticeAcknowledgement {
  id        Int @id @default(autoincrement())
  noticeId  Int
  teacherId Int

  isSeen  Boolean   @default(false)
  seenAt  DateTime? // Set this to the current time when the notice is seen
  notice  Notice    @relation(fields: [noticeId], references: [id], onDelete: Cascade)
  teacher Teacher   @relation(fields: [teacherId], references: [id])

  @@unique([noticeId, teacherId]) // Ensuring a unique record per notice per teacher
}

model StudentNotice {
  id                     Int                            @id @default(autoincrement())
  title                  String
  content                String
  adminId                Int
  createdAt              DateTime                       @default(now())
  updatedAt              DateTime                       @updatedAt
  admin                  Admin                          @relation(fields: [adminId], references: [id])
  studentAcknowledgement StudentNoticeAcknowledgement[]
}

model StudentNoticeAcknowledgement {
  id              Int           @id @default(autoincrement())
  studentNoticeId Int
  studentId       Int // Foreign key reference to Student
  isSeen          Boolean       @default(false)
  seenAt          DateTime? // Set this to the current time when the notice is seen
  studentNotice   StudentNotice @relation(fields: [studentNoticeId], references: [id], onDelete: Cascade)

  student Student @relation(fields: [studentId], references: [id])

  @@unique([studentNoticeId, studentId]) // Ensuring a unique record per notice per teacher
}

model Event {
  id    Int          @id @default(autoincrement())
  start DateTime     @default(now()) // Start date and time for the event
  end   DateTime     @default(now()) // End date and time for the event
  data  Appointment?
}

model Appointment {
  id          Int      @id @default(autoincrement())
  eventId     Int      @unique
  title       String
  color       String? // Optional color of the appointment
  isCompleted Boolean? @default(false)
  location    String?  @default("School")
  status      String?  @default("Melbourne")
  address     String?  @default("Langwarren")
  remarks     String?  @default("NA")
  type        String?  @default("Event")
  event       Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
}

// ------------------- for time table ------------------- //
model ClassRoom {
  id             Int             @id @default(autoincrement())
  name           String          @unique
  timetableSlots TimetableSlot[]
}

model TimeSlot {
  id             Int             @id @default(autoincrement())
  timeRange      String // "11:00 AM to 12:30 PM"
  timetableSlots TimetableSlot[]
}

model TimetableSlot {
  id                 Int              @id @default(autoincrement())
  timetableId        Int // Foreign key to link to Timetable
  classroomId        Int
  timeSlotId         Int
  termSubjectLevelId Int
  sectionId          Int
  teacherId          Int
  classroom          ClassRoom        @relation(fields: [classroomId], references: [id])
  timeSlot           TimeSlot         @relation(fields: [timeSlotId], references: [id])
  termSubjectLevel   TermSubjectLevel @relation(fields: [termSubjectLevelId], references: [id])
  section            Section          @relation(fields: [sectionId], references: [id])
  teacher            Teacher          @relation(fields: [teacherId], references: [id])
  timetable          Timetable        @relation(fields: [timetableId], references: [id])

  @@unique([timetableId, classroomId, timeSlotId, termSubjectLevelId, sectionId, teacherId])
}

model Timetable {
  id             Int             @id @default(autoincrement())
  name           String?         @default("Timetable")
  isActive       Boolean         @default(true)
  timetableSlots TimetableSlot[]
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}

// ------------------- for time table ------------------- //
