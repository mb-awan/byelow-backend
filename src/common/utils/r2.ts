import AWS from 'aws-sdk';

import { env } from './envConfig';

// Initialize R2 client
export const r2Client = new AWS.S3({
  endpoint: env.R2_BUCKET_URL,
  region: 'auto',
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

// Delete file from R2
export const deleteFileFromR2 = async (fileKey: string): Promise<void> => {
  try {
    const r2Client = getR2Client();
    await r2Client
      .deleteObject({
        Bucket: env.R2_BUCKET_NAME,
        Key: fileKey,
      })
      .promise();
  } catch (error: any) {
    throw new Error(`Failed to delete file from R2: ${error.message}`);
  }
};

// Upload file to R2
export const uploadFileToR2 = async (fileKey: string, fileBuffer: Buffer, contentType?: string): Promise<string> => {
  try {
    const r2Client = getR2Client();
    await r2Client
      .putObject({
        Bucket: env.R2_BUCKET_NAME,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: contentType || 'application/octet-stream',
      })
      .promise();

    return `${env.R2_BUCKET_URL}/${env.R2_BUCKET_NAME}/${fileKey}`;
  } catch (error: any) {
    throw new Error(`Failed to upload file to R2: ${error.message}`);
  }
};

// Check if file exists on R2
export const checkIfFileExistsonR2 = async (fileKey: string): Promise<boolean> => {
  try {
    const r2Client = getR2Client();
    await r2Client
      .headObject({
        Bucket: env.R2_BUCKET_NAME,
        Key: fileKey,
      })
      .promise();
    return true;
  } catch (error: any) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw error;
  }
};

