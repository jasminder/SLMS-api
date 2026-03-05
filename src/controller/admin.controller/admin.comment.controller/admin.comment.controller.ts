import { Request, Response, NextFunction } from 'express';

import { createComment, getCommentsByStudentId, updateComment } from '../../../service/admin.service/admin.comment.service/admin.comment.service';
import { CreateCommentsSchema, UpdateCommentSchema } from '../../../schema/admin.dto/admin.comment.dto/admin.comment.dto';

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
export const updateCommentHandler = async (req: Request<UpdateCommentSchema['params'], {}, UpdateCommentSchema['body']>, res: Response, next: NextFunction) => {
    const { commentId } = req.params;
    const { content, interactionType } = req.body;
    const result = await updateComment(commentId, content, interactionType);
    res.status(200).json(result);
};
