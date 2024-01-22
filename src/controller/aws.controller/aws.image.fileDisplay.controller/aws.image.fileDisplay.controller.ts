import { Request, Response, NextFunction } from 'express';


import { getImageDisplayPresignedUrl } from '../../../service/aws.service/aws.image.fileDisplay.service/aws.image.fileDisplay.service';
import { FileDisplayImageSchema } from '../../../schema/aws.dto/aws.image.fileDisplay.dto/aws.image.fileDisplay.dto';

export const getImageDisplayPresignedUrlHandler = async (req: Request<{}, {}, {}, FileDisplayImageSchema['query']>, res: Response, next: NextFunction) => {
    const { fileUrl } = req.query;
    const presignedUrlData = await getImageDisplayPresignedUrl(fileUrl);
    res.json(presignedUrlData);
};
