import { Request, Response, NextFunction } from 'express';

import { getHomeWorkDownloadPresignedUrl } from '../../service/aws.service/aws.homework.fileDownload.service/aws.homework.fileDownload.service';
import { FileDownloadHomeWorkSchema } from '../../schema/aws.homework.fileDownlod.dto/aws.homework.fileDownlod.dto';

export const getHomeWorkDownloadPresignedUrlHandler = async (req: Request<{}, {}, {}, FileDownloadHomeWorkSchema['query']>, res: Response, next: NextFunction) => {
    const { fileUrl } = req.query;
    const presignedUrlData = await getHomeWorkDownloadPresignedUrl(fileUrl);
    res.json(presignedUrlData);
};
