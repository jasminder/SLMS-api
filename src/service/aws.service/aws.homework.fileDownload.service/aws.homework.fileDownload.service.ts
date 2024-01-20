import S3 from 'aws-sdk/clients/s3';
import { randomUUID } from 'crypto';
import { customError } from '../../../utils/customError';

const s3 = new S3({
    apiVersion: '2006-03-01',
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
    region: process.env.REGION,
    signatureVersion: 'v4'
});

export const getHomeWorkDownloadPresignedUrl = async (fileUrl: string): Promise<{ downloadUrl: string; key: string }> => {
    if (!fileUrl || typeof fileUrl !== 'string') {
        throw customError('Filename and fileType are required.', 'fail', 400, true);
    }
    const Key = fileUrl;
    const s3Params = {
        Bucket: process.env.BUCKET_NAME,
        Key,
        Expires: 600
    };
    console.log(Key);
    const downloadUrl = await s3.getSignedUrlPromise('getObject', s3Params);
    return {
        downloadUrl,
        key: Key
    };
};
