import express from 'express';

import validate from '../../middleware/validateResource';
import { asyncErrorHandler } from '../../utils/asyncErrorHandler';

import { protectRoute } from '../../middleware/protectRoutes';
import { restrict } from '../../middleware/restrict';

import { getImageDisplayPresignedUrlHandler } from '../../controller/aws.controller/aws.image.fileDisplay.controller/aws.image.fileDisplay.controller';
import { fileDisplayImageSchema } from '../../schema/aws.dto/aws.image.fileDisplay.dto/aws.image.fileDisplay.dto';

const ImageDisplayRoute = express.Router();

// Protected: for authenticated admin/teacher/student
ImageDisplayRoute.route('/presignedUrl').get(validate(fileDisplayImageSchema), protectRoute, restrict('ADMIN', 'TEACHER','STUDENT'), asyncErrorHandler(getImageDisplayPresignedUrlHandler));

// Public: for unauthenticated users (e.g. student application form draft resume)
ImageDisplayRoute.route('/presignedUrl-public').get(validate(fileDisplayImageSchema), asyncErrorHandler(getImageDisplayPresignedUrlHandler));

export default ImageDisplayRoute;
