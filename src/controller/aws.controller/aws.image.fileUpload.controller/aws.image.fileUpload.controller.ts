import { Request, Response, NextFunction } from 'express';
import { getImageUploadPresignedUrl } from '../../../service/aws.service/aws.image.fileUpload.service/aws.image.fileUpload.service';
import { ImageUploadHomeWorkSchema } from '../../../schema/aws.dto/aws.image.fileUpload.dto/aws.image.fileUpload.dto';

export const getImageUploadPresignedUrlHandler = async (req: Request<{}, {}, {}, ImageUploadHomeWorkSchema['query']>, res: Response, next: NextFunction) => {
    const { fileType } = req.query;
    const presignedUrlData = await getImageUploadPresignedUrl(fileType);
    res.json(presignedUrlData);
};
