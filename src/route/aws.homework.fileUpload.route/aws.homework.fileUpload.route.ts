import express from 'express';

import validate from '../../middleware/validateResource';
import { asyncErrorHandler } from '../../utils/asyncErrorHandler';

import { protectRoute } from '../../middleware/protectRoutes';
import { restrict } from '../../middleware/restrict';
import { fileUploadHomeWorkSchema } from '../../schema/aws.dto/aws.homework.fileUpload.dto/aws.homework.fileUpload.dto';
import { getHomeWorkPresignedUrlHandler } from '../../controller/aws.controller/aws.homework.fileUpload.controller/aws.homework.fileUpload.controller';

const homeWorkUploadRoute = express.Router();

homeWorkUploadRoute.route('/presignedUrl').get(validate(fileUploadHomeWorkSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(getHomeWorkPresignedUrlHandler));

export default homeWorkUploadRoute;
