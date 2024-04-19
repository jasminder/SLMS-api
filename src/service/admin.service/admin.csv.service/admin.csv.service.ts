import { db } from '../../../utils/db.server';
import { parse } from 'json2csv';

export async function downloadStudentsCsvService(): Promise<string> {
    const students = await db.student.findMany({
        include: {
            personalDetails: true,
            parentsDetails: true,
            emergencyContact: true,
            healthInformation: true,
            otherInformation: true
        }
    });

    const flattenedStudents = students.map((student) => ({
        id: student.akaalId,
        role: student.role,
        isActive: student.isActive,
        firstName: student.personalDetails?.firstName || '',
        lastName: student.personalDetails?.lastName || '',
        DOB: student.personalDetails?.DOB || '',
        gender: student.personalDetails?.gender || '',
        email: student.personalDetails?.email || '',
        contact: student.personalDetails?.contact || '',
        address: student.personalDetails?.address || '',
        suburb: student.personalDetails?.suburb || '',
        state: student.personalDetails?.state || '',
        country: student.personalDetails?.country || '',
        postcode: student.personalDetails?.postcode || '',
        fatherName: student.parentsDetails?.fatherName || '',
        motherName: student.parentsDetails?.motherName || '',
        parentEmail: student.parentsDetails?.parentEmail || '',
        parentContact: student.parentsDetails?.parentContact || '',
        emergencyContactPerson: student.emergencyContact?.contactPerson || '',
        contactNumber: student.emergencyContact?.contactNumber || '',
        relationship: student.emergencyContact?.relationship || '',
        medicareNumber: student.healthInformation?.medicareNumber || '',
        ambulanceMembershipNumber: student.healthInformation?.ambulanceMembershipNumber || '',
        medicalCondition: student.healthInformation?.medicalCondition || '',
        allergy: student.healthInformation?.allergy || '',
        otherInfo: student.otherInformation?.otherInfo || '',
        declaration: student.otherInformation?.declaration.join(', ') || ''
    }));

    const fields = ['id', 'akaalId', 'firstName', 'lastName', 'email', 'fatherName', 'motherName', 'emergencyContactPerson', 'healthConditions', 'otherInfo'];
    const opts = { fields };

    return parse(flattenedStudents, opts);
}
