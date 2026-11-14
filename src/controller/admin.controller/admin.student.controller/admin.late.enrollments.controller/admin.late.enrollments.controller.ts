import { recordStudentProfileActivity } from '../../../../service/admin.service/admin.student.service/admin.student.activity.service/admin.student.activity.service';
import { NextFunction, Request, Response } from 'express';
import {
    FindAllLateEnrolledStudentsSchema,
    FindLateEnrolledStudentSubjectsSchema,
    FindUniqueLateEnrolledStudentSchema,
    LateEnrolledActiveStudentSchema,
    SearchLateEnrolledStudentsSchema
} from '../../../../schema/admin.dto/admin.student.dto/admin.late.enrollments.dto/admin.late.enrollments.dto';
import {
    findLateEnrolledStudentById,
    findLateEnrolledStudentEnrolledSubjects,
    findLateEnrolledStudents,
    findTermToEnrollForLateEnrolledStudent,
    lateEnrolledActiveStudent,
    searchLateEnrolledStudents
} from '../../../../service/admin.service/admin.student.service/admin.late.enrollments.service/admin.late.enrollments.service';
import {
    deEnrollStudentEnrolledToSubjects,
    enrollStudentEnrolledToSubjects
} from '../../../../service/admin.service/admin.student.service/admin.enrolled.student.service/admin.enrolled.student.service';
import { EnrolledStudentEnrollDataSchema } from '../../../../schema/admin.dto/admin.student.dto/admin.enrolledstudent/admin.enrolled.student.dto';

export const findLateEnrolledStudentsHandler = async (req: Request<{}, {}, {}, FindAllLateEnrolledStudentsSchema['query']>, res: Response, next: NextFunction) => {
    const { page, termId } = req.query;

    if (page && termId) {
        const allStudent = await findLateEnrolledStudents(+page, +termId);
        res.status(200).json(allStudent);
    } else if (termId) {
        const page = 0;
        const allStudent = await findLateEnrolledStudents(page, +termId);
        res.status(200).json(allStudent);
    }
};
export const searchLateEnrolledStudentsHandler = async (req: Request<{}, {}, {}, SearchLateEnrolledStudentsSchema['query']>, res: Response, next: NextFunction) => {
    const { search, page = 0, termId } = req.query;
    if (termId) {
        const searchResult = await searchLateEnrolledStudents(search, +page, +termId);
        res.status(200).json(searchResult);
    }
};
export const findLateEnrolledStudentByIdHandler = async (req: Request<FindUniqueLateEnrolledStudentSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const student = await findLateEnrolledStudentById(id);
    res.status(200).json(student);
};
// findTermToEnrollForStudentEnrolled
export const findTermToEnrollForLateEnrolledStudentHandler = async (req: Request<{}, {}, {}, {}>, res: Response, next: NextFunction) => {
    const termToEnroll = await findTermToEnrollForLateEnrolledStudent();
    res.status(200).json(termToEnroll);
};

export const findLateEnrolledStudentSubjectsHandler = async (req: Request<FindLateEnrolledStudentSubjectsSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { id, termId } = req.params;
    if (id && termId) {
        const enrolledSubjects = await findLateEnrolledStudentEnrolledSubjects(id, termId);
        res.status(200).json(enrolledSubjects);
    }
};
// enrollStudentEnrolledToSubjects
export const enrollStudentEnrolledToSubjectsHandler = async (req: Request<{}, {}, EnrolledStudentEnrollDataSchema['body'], {}>, res: Response, next: NextFunction) => {
    const enrollData = req.body;
    const termToEnroll = await enrollStudentEnrolledToSubjects(enrollData);
    res.status(200).json(termToEnroll);
};
export const deEnrollStudentEnrolledToSubjectsHandler = async (req: Request<{}, {}, EnrolledStudentEnrollDataSchema['body'], {}>, res: Response, next: NextFunction) => {
    const enrollData = req.body;
    const result = await deEnrollStudentEnrolledToSubjects(enrollData, { userId: req.user?.id, email: req.user?.email });
    // Same activity-log entry the active-student flow already writes (best effort: never blocks the de-enrolment).
    await recordStudentProfileActivity({
        studentId: enrollData.enrolledStudentId,
        actionType: 'DE_ENROLLMENT',
        description: 'De-enrolled from subject(s)',
        metadata: { enrollData: enrollData.enrollData },
        performedByUserId: req.user?.id,
        performedByEmail: req.user?.email ?? 'System'
    }).catch(() => {});
    res.status(200).json(result);
};
export const lateEnrolledActiveStudentHandler = async (req: Request<{}, {}, {}, LateEnrolledActiveStudentSchema['query']>, res: Response, next: NextFunction) => {
    const { id, termId } = req.query;
    if (id && termId) {
        const enrolledSubjects = await lateEnrolledActiveStudent(+id, termId);

        res.status(200).json(enrolledSubjects);
    }
};
