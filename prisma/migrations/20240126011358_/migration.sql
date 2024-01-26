-- AlterTable
ALTER TABLE "EmergencyContact" ALTER COLUMN "contactPerson" SET DEFAULT 'Not given';

-- AlterTable
ALTER TABLE "OtherInformation" ALTER COLUMN "declaration" SET DEFAULT ARRAY['']::TEXT[];

-- AlterTable
ALTER TABLE "PersonalDetails" ALTER COLUMN "country" SET DEFAULT 'Australia';

-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "subjectsChosen" SET DEFAULT ARRAY['Subjects Opted Not available']::TEXT[],
ALTER COLUMN "subjectRelated" SET DEFAULT ARRAY['Options Not available']::TEXT[];
