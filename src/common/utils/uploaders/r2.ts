import AWS from 'aws-sdk';

import { env } from '../envConfig';

export async function checkIfFileExistsonR2(fileKey: string): Promise<boolean> {
  try {
    if (!env.R2_BUCKET_URL || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
      throw new Error('R2 credentials not configured');
    }
    const r2 = new AWS.S3({
      endpoint: env.R2_BUCKET_URL,
      region: 'auto',
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });

    await r2.headObject({ Bucket: env.R2_BUCKET_NAME, Key: fileKey }).promise();
    return true;
  } catch (error: any) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw error;
  }
}
