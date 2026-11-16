import express, { Request, Response } from 'express';
import { getSendStatus } from '../../service/class.record.edit.service/class.record.edit.service';

import validate from '../../middleware/validateResource';
import {
    createHomeworkHandler,
    deleteHomeworkHandler,
    editHomeworkHandler,
    findAssignedHomeworkByTermAndSectionHandler,
    findHomeworkByIdHandler,
    findHomeworkBySubjectListHandler,
    findHomeworkByTermAndSectionHandler
} from '../../controller/homework.controller/homework.controller';
import {
    createHomeworkSchema,
    deleteHomeworkSchema,
    editHomeworkSchema,
    findAllHomeworksBySubjectsListSchema,
    findAssignedHomeworkByTermAndSectionSchema,
    findHomeworkByIdSchema,
    findHomeworkByTermAndSectionSchema
} from '../../schema/homework.dto/homework.dto';
import { asyncErrorHandler } from '../../utils/asyncErrorHandler';
import { protectRoute } from '../../middleware/protectRoutes';
import { restrict } from '../../middleware/restrict';

const homeworkRoute = express.Router();
/*sign up user*/
homeworkRoute.route('/create/:termSubjectLevelId/:sectionId/:uploaderId').post(validate(createHomeworkSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(createHomeworkHandler));
homeworkRoute.route('/find-by-id/:homeworkId').get(validate(findHomeworkByIdSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(findHomeworkByIdHandler));
homeworkRoute
    .route('/find-by-subjectList/:termSubjectLevelIds/:teacherId')
    .get(validate(findAllHomeworksBySubjectsListSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(findHomeworkBySubjectListHandler));

/* Find all homework records for a termsubjectlevelid and sectionid */
homeworkRoute
    .route('/find-by-class-termSubjectLevel-section/:teacherId')
    .get(validate(findHomeworkByTermAndSectionSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(findHomeworkByTermAndSectionHandler));
homeworkRoute
    .route('/find-all-by-class-termSubjectLevel-section/:teacherId')
    .get(validate(findAssignedHomeworkByTermAndSectionSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(findAssignedHomeworkByTermAndSectionHandler));

/* send status of one item, for the warning on the edit screen */
homeworkRoute.route('/send-status/:homeworkId').get(protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(async (req: Request, res: Response) => {
    const id = parseInt(String(req.params.homeworkId));
    if (!Number.isInteger(id)) {
        res.status(400).json({ status: 'fail', message: 'Invalid id' });
        return;
    }
    res.status(200).json({ status: await getSendStatus('HOMEWORK', id) });
}));

/* edit homework*/
homeworkRoute
    .route('/edit/:homeworkId/:termSubjectLevelId/:sectionId/:uploaderId')
    .patch(validate(editHomeworkSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(editHomeworkHandler));

/*delete homework*/
homeworkRoute.route('/delete/:homeworkId').delete(validate(deleteHomeworkSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(deleteHomeworkHandler));

export default homeworkRoute;
