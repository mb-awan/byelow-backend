import axios from 'axios';
import bcrypt from 'bcrypt';
import { v2 as cloudinary } from 'cloudinary';
import jwt from 'jsonwebtoken';
import qs from 'qs';

import { AUTH_PATHS } from '@/apis/auth/router';

import { API_ROUTES } from '../constants/common';
import { UserRoles } from '../constants/enums';
import { IUserPayload, User } from '../models/user';
import { env } from './envConfig';

// Configure Cloudinary if credentials are provided
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

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

  const token = jwt.sign(payload, JWT_SECRET_KEY as any, { expiresIn: JWT_EXPIRES_IN as any });

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

export const uploadGoogleProfileImage = async (imageUrl: string): Promise<string | null> => {
  try {
    // Check if Cloudinary credentials are configured
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      console.warn('Cloudinary credentials not configured, skipping image upload');
      return null;
    }

    // Fetch the image from Google's URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // Get the image data as a Buffer
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // Upload to Cloudinary
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: 'profiles',
            resource_type: 'image',
            transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
          },
          (error, result) => {
            if (error) {
              console.error('Error uploading Google profile image to Cloudinary:', error);
              return reject(null);
            }
            if (result && result.secure_url) {
              resolve(result.secure_url);
            } else {
              reject(null);
            }
          }
        )
        .end(imageBuffer);
    });
  } catch (error) {
    console.error('Error uploading Google profile image:', error);
    return null;
  }
};
