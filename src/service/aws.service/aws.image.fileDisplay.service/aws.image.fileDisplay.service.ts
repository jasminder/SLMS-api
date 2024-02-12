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

export const getImageDisplayPresignedUrl = async (fileUrl: string): Promise<{ downloadUrl: string; key: string }> => {
    if (!fileUrl || typeof fileUrl !== 'string') {
        throw customError('Filename and fileType are required.', 'fail', 400, true);
    }
    const bucketUrl = `https://${process.env.BUCKET_NAME}.s3.${process.env.REGION}.amazonaws.com/`;
    const Key = fileUrl.replace(bucketUrl, '');

    if (!Key) {
        throw customError('Invalid file URL.', 'fail', 400, true);
    }

    const s3Params = {
        Bucket: process.env.BUCKET_NAME,
        Key,
        Expires: 72000 // 20 hours
    };
    const downloadUrl = await s3.getSignedUrlPromise('getObject', s3Params);
    // console.log(process.env.BUCKET_NAME, Key, 'inside filedisplay');
    // console.log(downloadUrl, 'inside file display');
    return {
        downloadUrl,
        key: Key
    };
};
