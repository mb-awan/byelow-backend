import axios from 'axios';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import qs from 'qs';

import { AUTH_PATHS } from '@/apis/auth/router';
import { S3Client } from '@aws-sdk/client-s3';

import { API_ROUTES } from '../constants/common';
import { UserRoles } from '../constants/enums';
import { IUserPayload, User } from '../models/user';
import { env } from './envConfig';

const { JWT_SECRET_KEY, JWT_EXPIRES_IN, BCRYPT_SALT_ROUNDS } = env;

export const generateToken = (user: any) => {
  const payload: IUserPayload = {
    id: user?._id,
    email: user.email,
    username: user.username,
    emailVerified: user.emailVerified,
    describedRole: user.describedRole,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role?.name || UserRoles.USER,
  };

  const token = jwt.sign(payload, JWT_SECRET_KEY, { expiresIn: JWT_EXPIRES_IN });

  return token;
};

export const verifyToken = (token: string) => {
  const decoded = jwt.verify(token, JWT_SECRET_KEY);

  return decoded;
};

export const hashPassword = async (password: string) => {
  const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  return hashedPassword;
};

export const isValidPassword = async (password: string, hashedPassword: string) => {
  console.log('Plain password:', password);
  console.log('Hashed password:', hashedPassword);
  const validPassword = await bcrypt.compare(password, hashedPassword);

  return validPassword;
};

export const hashOTP = async (otp: string) => {
  const hashedOTP = await bcrypt.hash(otp, BCRYPT_SALT_ROUNDS);

  return hashedOTP;
};

export const isValidOTP = async (otp: string, hashedOTP: string) => {
  const validOTP = await bcrypt.compare(otp, hashedOTP);

  return validOTP;
};

interface IGetUserByIdOrEmailOrUsernameOrPhone {
  id?: string;
  email?: string;
  username?: string;
  phone?: string;
}

export const getUserByIdOrEmailOrUsernameOrPhone = async (params: IGetUserByIdOrEmailOrUsernameOrPhone) => {
  const { id, email, username, phone } = params;
  const user = await User.findOne({
    $or: [{ email }, { username }, { phone, phoneVerified: true }, { _id: id }],
  }).select('-password -__v ');

  return user;
};

export const getGoogleCode = async (code: string): Promise<any> => {
  const url = 'https://oauth2.googleapis.com/token';
  const values = {
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: `${env.BACKEND_BASE_URL}${API_ROUTES.AUTH}${AUTH_PATHS.GOOGLE_OAUTH_CALLBACK}`,
    grant_type: 'authorization_code',
  };
  const res = await axios.post(url, qs.stringify(values), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return res.data;
};

export const uploadGoogleProfileImage = async (imageUrl: string, bucketName: string): Promise<string | null> => {
  try {
    const timestamp = Date.now();

    // Fetch the image from Google's URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // Get the image data as an ArrayBuffer
    const imageBuffer = await response.arrayBuffer();

    // Get content type from response headers or default to image/jpeg
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Determine file extension based on content type
    let extension = 'jpg';
    if (contentType.includes('png')) extension = 'png';
    if (contentType.includes('gif')) extension = 'gif';
    if (contentType.includes('webp')) extension = 'webp';

    // Create a unique key for the image
    const avatarKey = `profiles/${timestamp}.${extension}`;

    // Check if R2 credentials are configured
    if (!env.R2_BUCKET_URL || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
      console.warn('R2 credentials not configured, skipping image upload');
      return null;
    }

    // Create S3 client for R2
    const s3Client = new S3Client({
      endpoint: env.R2_BUCKET_URL,
      region: 'auto',
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });

    // Upload to R2
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new PutObjectCommand({
      Bucket: bucketName || env.R2_BUCKET_NAME,
      Key: avatarKey,
      Body: Buffer.from(imageBuffer),
      ContentType: contentType,
    });

    await s3Client.send(command);

    return avatarKey;
  } catch (error) {
    console.error('Error uploading Google profile image:', error);
    return null;
  }
};
