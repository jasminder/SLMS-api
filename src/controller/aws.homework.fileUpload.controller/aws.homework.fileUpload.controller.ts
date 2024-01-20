import { Request, Response, NextFunction } from 'express';
import { getHomeWorkPresignedUrl } from '../../service/aws.service/aws.homework.fileUpload.service/aws.homework.fileUpload.service';
import { FileUploadHomeWorkSchema } from '../../schema/aws.homework.fileUpload.dto/aws.homework.fileUpload.dto';

export const getHomeWorkPresignedUrlHandler = async (req: Request<{}, {}, {}, FileUploadHomeWorkSchema['query']>, res: Response, next: NextFunction) => {
    const { fileName, fileType } = req.query;
    const presignedUrlData = await getHomeWorkPresignedUrl(fileName, fileType);
    res.json(presignedUrlData);
};
