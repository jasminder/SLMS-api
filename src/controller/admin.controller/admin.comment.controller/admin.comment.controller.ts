import { Request, Response, NextFunction } from 'express';

import { createComment } from '../../../service/admin.service/admin.comment.service/admin.comment.service';
import { getCommentsByStudentId } from '../../../service/admin.service/admin.comment.service/admin.comment.service';
import { CreateCommentsSchema } from '../../../schema/admin.dto/admin.comment.dto/admin.comment.dto';

export const getCommentsHandler = async (req: Request, res: Response, next: NextFunction) => {
    const { studentId } = req.params;
    const comments = await getCommentsByStudentId(studentId);
    res.status(200).json(comments);
};
export const createCommentHandler = async (req: Request<{}, {}, CreateCommentsSchema['body']>, res: Response, next: NextFunction) => {
    const { studentId, adminId, content, interactionType } = req.body;
    const result = await createComment(studentId, adminId, content, interactionType);
    res.status(201).json(result);
};
