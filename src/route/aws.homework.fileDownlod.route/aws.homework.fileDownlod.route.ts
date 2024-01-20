import express from 'express';

import validate from '../../middleware/validateResource';
import { asyncErrorHandler } from '../../utils/asyncErrorHandler';
import { getHomeWorkPresignedUrlHandler } from '../../controller/aws.homework.fileUpload.controller/aws.homework.fileUpload.controller';
import { protectRoute } from '../../middleware/protectRoutes';
import { restrict } from '../../middleware/restrict';
import { fileUploadHomeWorkSchema } from '../../schema/aws.homework.fileUpload.dto/aws.homework.fileUpload.dto';
import { getHomeWorkDownloadPresignedUrlHandler } from '../../controller/aws.homework.fileDownlod.controller/aws.homework.fileDownlod.controller';
import { fileDownloadHomeWorkSchema } from '../../schema/aws.homework.fileDownlod.dto/aws.homework.fileDownlod.dto';

const homeWorkDownloadRoute = express.Router();

homeWorkDownloadRoute.route('/presignedUrl').get(validate(fileDownloadHomeWorkSchema), protectRoute, restrict('ADMIN', 'TEACHER'), asyncErrorHandler(getHomeWorkDownloadPresignedUrlHandler));

export default homeWorkDownloadRoute;
