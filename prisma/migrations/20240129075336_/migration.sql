-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "subjectsChosen" SET DEFAULT ARRAY['Subjects Chosen Not available']::TEXT[];
DROP SEQUENCE "Student_id_seq";
