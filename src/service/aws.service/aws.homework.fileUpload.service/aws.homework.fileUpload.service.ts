import S3 from 'aws-sdk/clients/s3';
import { randomUUID } from 'crypto';
import { customError } from '../../../utils/customError';
import { attachmentKeyExtension } from './attachment.key.rules';

const s3 = new S3({
    apiVersion: '2006-03-01',
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
    region: process.env.REGION,
    signatureVersion: 'v4'
});

export const getHomeWorkPresignedUrl = async (fileName: string, fileType: string): Promise<{ uploadUrl: string; key: string }> => {
    if (!fileName || typeof fileName !== 'string' || !fileType || typeof fileType !== 'string') {
        throw customError('Filename and fileType are required.', 'fail', 400, true);
    }
    const decodedFileType = decodeURIComponent(fileType);
    const fileTypeParts = decodedFileType.split('/');
    if (fileTypeParts.length !== 2 || !fileTypeParts[1]) {
        throw customError('Invalid fileType format. Expected format: type/extension', 'fail', 400, true);
    }
    // Issue 12: the original file name's extension when it is a plain 1-10 character one, otherwise the MIME subtype (as before).
    const extension = attachmentKeyExtension(fileName, fileTypeParts[1]);

    const Key = `${fileName}-${randomUUID()}.${extension}`;

    const s3Params = {
        Bucket: process.env.BUCKET_NAME,
        Key,
        Expires: 600,
        ContentType: fileType
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', s3Params);
    return {
        uploadUrl,
        key: Key
    };
};
