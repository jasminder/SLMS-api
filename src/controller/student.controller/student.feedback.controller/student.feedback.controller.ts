import { Request, Response, NextFunction } from 'express';
import { getFeedbackForStudent } from '../../../service/student.service/student.feedback.service/student.feedback.service';
import { GetFeedbackForStudentSchema } from '../../../schema/student.dto/student.feedback.dto/student.feedback.dto';

export const getFeedbackForStudentHandler = async (req: Request<GetFeedbackForStudentSchema['params'], {}, {}, {}>, res: Response, next: NextFunction) => {
    const { studentId, termSubjectLevelId } = req.params;
    const feedback = await getFeedbackForStudent(studentId, termSubjectLevelId);
    res.status(200).json(feedback);
};
