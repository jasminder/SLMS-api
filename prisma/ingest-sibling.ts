/**
 * Ingest a sibling for an existing student.
 * Siblings are determined by shared personalDetails.email (active-student API).
 *
 * Usage:
 *   npx ts-node prisma/ingest-sibling.ts [studentId]
 *   Default studentId: 5297
 *
 * This creates a new Student with the same personalDetails.email and
 * parentsDetails as the given student so they appear as siblings.
 */

import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const prisma = new PrismaClient();

const STUDENT_ID = process.argv[2] ? parseInt(process.argv[2], 10) : 5297;
const MELBOURNE_TZ = 'Australia/Melbourne';

async function ingestSibling() {
  console.log(`Fetching student id ${STUDENT_ID}...`);

  const existing = await prisma.student.findUnique({
    where: { id: STUDENT_ID },
    include: {
      personalDetails: true,
      parentsDetails: true,
      emergencyContact: true,
      healthInformation: true,
      otherInformation: true,
    },
  });

  if (!existing) {
    throw new Error(`Student with id ${STUDENT_ID} not found.`);
  }

  const pd = existing.personalDetails;
  const parents = existing.parentsDetails;
  const emergency = existing.emergencyContact;
  const health = existing.healthInformation;
  const other = existing.otherInformation;

  if (!pd || !parents) {
    throw new Error(`Student ${STUDENT_ID} is missing personalDetails or parentsDetails.`);
  }

  // Same email so this student appears as sibling in active-student API
  const siblingEmail = pd.email;
  // Different name/DOB/contact for the new sibling (edit as needed)
  const siblingDOB = new Date('2012-06-15T00:00:00.000Z');
  const siblingDOBFormatted = format(toZonedTime(siblingDOB, MELBOURNE_TZ), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

  const sibling = await prisma.student.create({
    data: {
      personalDetails: {
        create: {
          firstName: 'Sibling',
          lastName: `Of${STUDENT_ID}`,
          DOB: siblingDOBFormatted,
          gender: 'Prefer not to say',
          email: siblingEmail,
          contact: parents.parentContact,
          address: pd.address,
          suburb: pd.suburb,
          state: pd.state,
          country: pd.country,
          postcode: pd.postcode,
          image: pd.image ?? undefined,
        },
      },
      parentsDetails: {
        create: {
          fatherName: parents.fatherName,
          motherName: parents.motherName,
          parentContact: parents.parentContact,
          parentEmail: parents.parentEmail,
        },
      },
      emergencyContact: {
        create: emergency
          ? {
              contactPerson: emergency.contactPerson,
              contactNumber: emergency.contactNumber,
              relationship: emergency.relationship,
            }
          : {
              contactPerson: parents.fatherName || parents.motherName,
              contactNumber: parents.parentContact,
              relationship: 'Parent',
            },
      },
      healthInformation: {
        create: health
          ? {
              medicareNumber: health.medicareNumber ?? 'No Medicare Number provided',
              ambulanceMembershipNumber: health.ambulanceMembershipNumber ?? '',
              medicalCondition: health.medicalCondition,
              allergy: health.allergy,
            }
          : {
              medicareNumber: 'No Medicare Number provided',
              ambulanceMembershipNumber: '',
              medicalCondition: 'None',
              allergy: 'None',
            },
      },
      subjectsChosen: existing.subjectsChosen ?? [],
      subjectRelated: existing.subjectRelated ?? [],
      otherInformation: {
        create: other
          ? { otherInfo: other.otherInfo, declaration: other.declaration }
          : { otherInfo: 'No information provided', declaration: ['N/A'] },
      },
    },
    include: {
      personalDetails: true,
      parentsDetails: true,
    },
  });

  console.log(`Sibling created: Student id ${sibling.id}`);
  console.log(`  Name: ${sibling.personalDetails?.firstName} ${sibling.personalDetails?.lastName}`);
  console.log(`  Email (same as ${STUDENT_ID}): ${sibling.personalDetails?.email}`);
  console.log(`  Parent email: ${sibling.parentsDetails?.parentEmail}`);
  console.log('They will appear as siblings when fetching active-student-detail for id', STUDENT_ID);
}

ingestSibling()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
