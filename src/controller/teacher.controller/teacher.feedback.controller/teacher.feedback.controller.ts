import { NextFunction, Request, Response } from 'express';
import { createFeedback } from '../../../service/teacher.service/teacher.feedback.service/teacher.feedback.service';
import { CreateFeedbackSchema } from '../../../schema/teacher.dto/teacher.feedback.dto/teacher.feedback.dto';

export const createFeedbackHandler = async (req: Request<{}, {}, CreateFeedbackSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { studentId, teacherId, content, title, className, roomName, sectionId, termSubjectLevelId, classTime } = req.body;
    const feedback = await createFeedback(studentId, teacherId, termSubjectLevelId, sectionId, content, title, className, roomName, classTime);
    res.status(201).json(feedback);
};
