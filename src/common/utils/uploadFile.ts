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
  try {
    // Extract public_id from Cloudinary URL
    // Cloudinary URLs format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{transformations}/{version}/{public_id}.{format}
    // Or: https://res.cloudinary.com/{cloud_name}/image/upload/{folder}/{public_id}.{format}
    const urlParts = url.split('/');
    const uploadIndex = urlParts.findIndex((part) => part === 'upload');

    if (uploadIndex === -1) {
      throw new Error('Invalid Cloudinary URL');
    }

    // Get the path after 'upload'
    const pathAfterUpload = urlParts.slice(uploadIndex + 1).join('/');

    // Remove file extension and version if present
    // Format: v1234567890/folder/public_id.format or folder/public_id.format
    let publicId = pathAfterUpload.replace(/^v\d+\//, ''); // Remove version prefix
    publicId = publicId.replace(/\.[^/.]+$/, ''); // Remove file extension

    if (!publicId) {
      throw new Error('Could not extract public_id from URL');
    }

    await cloudinary.uploader.destroy(publicId);
  } catch (error: any) {
    throw new Error(`Failed to delete file from Cloudinary: ${error.message}`);
  }
};

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});
