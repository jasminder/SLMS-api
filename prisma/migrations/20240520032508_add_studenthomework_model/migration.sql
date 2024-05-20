-- CreateTable
CREATE TABLE "StudentHomework" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "homeworkId" INTEGER NOT NULL,
    "submissionDate" TIMESTAMP(3),
    "grade" TEXT,
    "feedback" TEXT,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "attachments" TEXT[],

    CONSTRAINT "StudentHomework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentClasswork" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "classworkId" INTEGER NOT NULL,
    "submissionDate" TIMESTAMP(3),
    "grade" TEXT,
    "feedback" TEXT,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "attachments" TEXT[],

    CONSTRAINT "StudentClasswork_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentHomework_studentId_homeworkId_key" ON "StudentHomework"("studentId", "homeworkId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentClasswork_studentId_classworkId_key" ON "StudentClasswork"("studentId", "classworkId");

-- AddForeignKey
ALTER TABLE "StudentHomework" ADD CONSTRAINT "StudentHomework_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHomework" ADD CONSTRAINT "StudentHomework_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentClasswork" ADD CONSTRAINT "StudentClasswork_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentClasswork" ADD CONSTRAINT "StudentClasswork_classworkId_fkey" FOREIGN KEY ("classworkId") REFERENCES "Classwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
