import express from 'express';

import validate from '../../middleware/validateResource';
import { asyncErrorHandler } from '../../utils/asyncErrorHandler';

import { protectRoute } from '../../middleware/protectRoutes';
import { restrict } from '../../middleware/restrict';
import { getImageUploadPresignedUrlHandler } from '../../controller/aws.controller/aws.image.fileUpload.controller/aws.image.fileUpload.controller';
import { imageUploadHomeWorkSchema } from '../../schema/aws.dto/aws.image.fileUpload.dto/aws.image.fileUpload.dto';

const ImageUploadRoute = express.Router();

ImageUploadRoute.route('/presignedUrl').get(validate(imageUploadHomeWorkSchema), asyncErrorHandler(getImageUploadPresignedUrlHandler));

export default ImageUploadRoute;
