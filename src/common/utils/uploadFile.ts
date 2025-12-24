import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

import { env } from '@/common/utils/envConfig';

export const UploadImage = multer({ dest: 'public/images' });

// Configure Cloudinary only if credentials are provided
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}
export const uploadFileToCloudinary = async (fileBuffer: Buffer) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: 'workspaces' }, (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      })
      .end(fileBuffer);
  });
};

export const deleteFileFromCloudinary = async (url: string) => {
  const publicId = url.split('/').pop()?.split('.')[0];
  try {
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    } else {
      throw new Error('Invalid URL');
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
};

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});
