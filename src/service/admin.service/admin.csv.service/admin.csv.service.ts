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

export async function downloadTeachersCsvService() {
    const teachers = await db.teacher.findMany({
        include: {
            teacherPersonalDetails: true,
            teacherEmergencyContact: true,
            teacherWWCHealthInformation: true,
            teacherWorkRights: true,
            teacherQualificationAvailability: true,
            teacherBankDetails: true,
            teacherOtherInformation: true
        }
    });

    return teachers.map((teacher) => ({
        id: teacher.id,
        role: teacher.role,
        isActive: teacher.isActive,
        isAllowedLogin: teacher.isAllowedLogin,
        firstName: teacher.teacherPersonalDetails?.firstName || '',
        lastName: teacher.teacherPersonalDetails?.lastName || '',
        DOB: teacher.teacherPersonalDetails?.DOB || '',
        gender: teacher.teacherPersonalDetails?.gender || '',
        email: teacher.teacherPersonalDetails?.email || '',
        contact: teacher.teacherPersonalDetails?.contact || '',
        address: teacher.teacherPersonalDetails?.address || '',
        suburb: teacher.teacherPersonalDetails?.suburb || '',
        state: teacher.teacherPersonalDetails?.state || '',
        country: teacher.teacherPersonalDetails?.country || '',
        postcode: teacher.teacherPersonalDetails?.postcode || '',
        contactPerson: teacher.teacherEmergencyContact?.contactPerson || '',
        contactNumber: teacher.teacherEmergencyContact?.contactNumber || '',
        relationship: teacher.teacherEmergencyContact?.relationship || '',
        medicareNumber: teacher.teacherWWCHealthInformation?.medicareNumber || '',
        medicalCondition: teacher.teacherWWCHealthInformation?.medicalCondition || '',
        childrenCheckCardNumber: teacher.teacherWWCHealthInformation?.childrenCheckCardNumber || '',
        workingWithChildrenCheckExpiry: teacher.teacherWWCHealthInformation?.workingWithChildrenCheckExpiry?.toISOString().split('T')[0] || '',
        workRights: teacher.teacherWorkRights?.workRights,
        immigrationStatus: teacher.teacherWorkRights?.immigrationStatus || '',
        qualification: teacher.teacherQualificationAvailability?.qualification || '',
        experience: teacher.teacherQualificationAvailability?.experience || '',
        subjectsChosen: teacher.teacherQualificationAvailability?.subjectsChosen.join(', ') || '',
        timeSlotsChosen: teacher.teacherQualificationAvailability?.timeSlotsChosen.join(', ') || '',
        bankAccountName: teacher.teacherBankDetails?.bankAccountName || '',
        BSB: teacher.teacherBankDetails?.BSB || '',
        accountNumber: teacher.teacherBankDetails?.accountNumber || '',
        ABN: teacher.teacherBankDetails?.ABN || '',
        otherInfo: teacher.teacherOtherInformation?.otherInfo || ''
    }));
}
