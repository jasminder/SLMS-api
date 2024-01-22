import { NextFunction, Request, Response } from 'express';
import { createFeedback } from '../../../service/teacher.service/teacher.feedback.service/teacher.feedback.service';
import { CreateFeedbackSchema } from '../../../schema/teacher.dto/teacher.feedback.dto/teacher.feedback.dto';

export const createFeedbackHandler = async (req: Request<{}, {}, CreateFeedbackSchema['body'], {}>, res: Response, next: NextFunction) => {
    const { studentId, teacherId, content, title } = req.body;
    const feedback = await createFeedback(studentId, teacherId, content, title);
    res.status(201).json(feedback);
};
