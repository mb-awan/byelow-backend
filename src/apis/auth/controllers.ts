import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt, { JwtPayload } from 'jsonwebtoken';
import moment from 'moment';
import { Types } from 'mongoose';

import { API_ROUTES } from '@/common/constants/common';
import { UserRoles, UserStatus } from '@/common/constants/enums';
import { IRoleDoc, Role } from '@/common/models/role';
import { IUserDoc, User } from '@/common/models/user';
import { Workspace } from '@/common/models/workspace';
import {
  generateToken,
  getGoogleCode,
  hashOTP,
  hashPassword,
  isValidOTP,
  isValidPassword,
  uploadGoogleProfileImage,
} from '@/common/utils/auth';
import { sendForgotPasswordOTP, sendVerificationEmailOTP } from '@/common/utils/emailService';
import { env } from '@/common/utils/envConfig';
import { generateOTP } from '@/common/utils/generateOTP';
import { APIResponse } from '@/common/utils/response';
import { logger } from '@/server';

import { AUTH_PATHS } from './router';

// Register user controller
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return APIResponse.error(res, 'Password and Confirm Password do not match', null, StatusCodes.BAD_REQUEST);
    }

    const existingUser = await User.findOne({
      $or: [{ email }],
    });

    if (existingUser?.email === email) {
      return APIResponse.error(res, 'User already exists', null, StatusCodes.CONFLICT);
    }
    if (existingUser?.firstName === firstName) {
      return APIResponse.error(res, 'This Last Name is taken', null, StatusCodes.BAD_REQUEST);
    }
    if (existingUser?.lastName === lastName) {
      return APIResponse.error(res, 'This Last Name is taken', null, StatusCodes.BAD_REQUEST);
    }

    if (existingUser && existingUser.status !== UserStatus.DELETED) {
      return APIResponse.error(res, 'User already exists', null, StatusCodes.BAD_REQUEST);
    }

    const hashedPassword = await hashPassword(password);

    const userRole = await Role.findOne({ name: UserRoles.USER });

    if (!userRole) {
      return APIResponse.error(res, 'User role not found', null, StatusCodes.NOT_FOUND);
    }

    const otp = generateOTP(6);
    const hashedOTP = await hashOTP(otp);

    let user = null;

    // Send email to user with OTP if user is not created by the admin (Hint: there will be no user in the req.user object if the user is not created by the admin)
    if (!existingUser) {
      const newUser = new User({
        firstName,
        lastName,
        username: req.body.email,
        email,
        password: hashedPassword,
        emailVerificationOTP: hashedOTP,
        emailVerificationOtpExpiresAt: moment().add(2, 'minutes').toDate(),
        role: userRole._id,
        status: UserStatus.ACTIVE,
      });

      const defaultWorkspace = new Workspace({
        name: 'Default Workspace',
        slug: `default-${newUser._id}`,
        ownerId: newUser._id,
        members: [],
      });

      const workspace = await defaultWorkspace.save();

      if (!workspace) {
        return APIResponse.error(res, 'Error while registering', null, StatusCodes.INTERNAL_SERVER_ERROR);
      }

      newUser.workspaces.push(workspace!._id as Types.ObjectId);
      user = await newUser.save();
    } else {
      Object.keys(req.body).forEach((key) => {
        (existingUser as any)[key] = req.body[key];
      });
      existingUser.firstName = firstName;
      existingUser.lastName = lastName;
      existingUser.username = email;
      existingUser.email = email;
      existingUser.password = hashedPassword;
      existingUser.emailVerificationOTP = hashedOTP;
      existingUser.emailVerificationOtpExpiresAt = moment().add(2, 'minutes').toDate();
      existingUser.role = userRole._id as Types.ObjectId;
      existingUser.status = UserStatus.ACTIVE;
      existingUser.emailVerified = false;
      existingUser.phoneVerified = false;
      existingUser.phone = '';
      existingUser.TFAEnabled = false;

      const defaultWorkspace = new Workspace({
        name: 'Default Workspace',
        ownerId: existingUser._id,
        members: [],
        socialMediaProfiles: [],
      });

      const workspace = await defaultWorkspace.save();

      if (!workspace) {
        return APIResponse.error(res, 'Error while registering', null, StatusCodes.INTERNAL_SERVER_ERROR);
      }

      existingUser.workspaces = [workspace!._id as Types.ObjectId];

      user = await existingUser.save();
    }

    if (!user) {
      return APIResponse.error(res, 'Error while registering', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    // TODO: Send confirmation email to the user that admin has creaed an account on there email and send the credentials to login to the user
    const token = generateToken({ ...user.toObject(), role: UserRoles.USER });

    if (!token) {
      return APIResponse.error(
        res,
        'You have registered successfully, but unfortunately something went wrong while generating token, so please login with your credentials to get the token',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    if (env.NODE_ENV === 'production') {
      // Send email to user with OTP
      await sendVerificationEmailOTP(email, otp, `${firstName || ''}${lastName ? ' ' + lastName : ''}`);
    } else {
      logger.info({ emailOTPOnRegister: otp });
    }

    return APIResponse.success(res, 'User registered successfully', { token }, StatusCodes.CREATED);
  } catch (error: any) {
    logger.error('Error while registering 456', error);
    return APIResponse.error(res, 'Error while registering', error, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
// Login user controller
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { identifier, password, fromAdminPanel } = req.body;

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }, { phone: identifier }],
    }).populate({
      path: 'role',
    });

    if (!user) {
      return APIResponse.error(res, 'Invalid Credentials', null, StatusCodes.BAD_REQUEST);
    }

    if (user.status === UserStatus.DELETED) {
      return APIResponse.error(res, 'Invalid Credentials', null, StatusCodes.BAD_REQUEST);
    }

    const userRole = user.role as unknown as string as IRoleDoc['name'];

    // only allow admin and subadmin to login from admin panel
    if (fromAdminPanel && userRole === UserRoles.USER) {
      return APIResponse.error(res, 'Invalid Credentials', null, StatusCodes.BAD_REQUEST);
    }

    if (user.googleOAuth) {
      return APIResponse.error(res, 'Invalid Credentials', null, StatusCodes.BAD_REQUEST);
    }

    const validPassword = await isValidPassword(password, user.password);

    if (!validPassword) {
      return APIResponse.error(res, 'Invalid Credentials', null, StatusCodes.BAD_REQUEST);
    }

    if (user.status === UserStatus.BLOCKED) {
      return APIResponse.error(res, 'User is blocked', null, StatusCodes.FORBIDDEN);
    }

    const token = generateToken(user);

    if (user.TFAEnabled) {
      const otp = generateOTP(6);
      user.TFAOTP = await hashOTP(otp);
      console.log({ TFAOTP: otp });
      //TODO: send the OTP to the user's email
      await user.save();

      return APIResponse.success(res, 'Logged in successfully', {
        token,
        TFAEnabled: true,
      });
    }

    if (!user.emailVerified) {
      const otp = generateOTP(6);
      user.emailVerificationOTP = await hashOTP(otp);
      user.emailVerificationOtpExpiresAt = moment().add(2, 'minutes').toDate();
      await user.save();

      if (env.NODE_ENV === 'production') {
        // Send email to user with OTP
        await sendVerificationEmailOTP(
          user!.email,
          otp,
          `${user?.firstName || ''}${user?.lastName ? ' ' + user?.lastName : ''}`
        );
      } else {
        logger.info({ emailVerifyOTPOnLogin: otp });
      }
    }

    return APIResponse.success(res, 'Logged in successfully', {
      token,
      TFAEnabled: false,
    });
  } catch (error) {
    console.log({ error });
    return APIResponse.error(res, 'Internal server error', error, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// verify username controller
export const validateUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return APIResponse.success(res, 'Username not exists', { exists: false }, StatusCodes.OK);
    }

    if (user.status === UserStatus.DELETED) {
      return APIResponse.success(res, 'Username not exists', { exists: false }, StatusCodes.OK);
    }

    if (user) {
      return APIResponse.success(res, 'Username exists', { exists: true }, StatusCodes.OK);
    }
  } catch (error) {
    return APIResponse.error(res, 'Internal server error', error, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const validateEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return APIResponse.success(res, 'email not exists', { exists: false }, StatusCodes.OK);
    }

    if (user.status === UserStatus.DELETED) {
      return APIResponse.success(res, 'email not exists', { exists: false }, StatusCodes.OK);
    }

    if (user) {
      return APIResponse.success(res, 'email exists', { exists: true }, StatusCodes.OK);
    }
  } catch (error) {
    return APIResponse.error(res, 'Internal server error', error, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// request forgot password OTP controller
export const requestForgotPasswordOTP = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }, { phone: identifier }],
    }).populate({
      path: 'role',
    });

    if (!user) {
      return APIResponse.error(res, 'User not found', null, StatusCodes.NOT_FOUND);
    }

    if (user.status === UserStatus.DELETED) {
      return APIResponse.error(res, 'User not found', null, StatusCodes.NOT_FOUND);
    }

    if (user.status === UserStatus.BLOCKED) {
      return APIResponse.error(res, 'User is blocked', null, StatusCodes.FORBIDDEN);
    }

    const otp = generateOTP(6);
    user.forgotPasswordOTP = await hashOTP(otp);
    user.forgotPasswordOTPExpiresAt = moment().add(2, 'minutes').toDate();

    await user.save();

    if (env.NODE_ENV === 'production') {
      // Send email to user with OTP
      await sendForgotPasswordOTP(
        user!.email,
        otp,
        `${user?.firstName || ''}${user?.lastName ? ' ' + user?.lastName : ''}`
      );
    } else {
      logger.info({ emailOTPOnRegister: otp });
    }

    return APIResponse.success(res, 'OTP sent successfully', null, StatusCodes.OK);
  } catch (error: any) {
    return APIResponse.error(res, 'Internal server error', error, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// verify forgot password OTP controller
export const verifyforgotPasswordOTP = async (req: Request, res: Response) => {
  try {
    const { identifier, otp } = req.query;

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }, { phone: identifier }],
    }).populate({
      path: 'role',
    });

    if (!user) {
      return APIResponse.error(res, 'User not found', null, StatusCodes.NOT_FOUND);
    }

    if (!user.forgotPasswordOTP || !user.forgotPasswordOTPExpiresAt) {
      return APIResponse.error(res, 'Invalid or Expired OTP', null, StatusCodes.BAD_REQUEST);
    }

    const otpExpired = moment().isAfter(moment(user.forgotPasswordOTPExpiresAt));

    const validOTP = await isValidOTP(otp as string, user.forgotPasswordOTP as string);
    // Check if the OTP matches the forgotPasswordOTP stored in the user document
    if (!validOTP) {
      return APIResponse.error(res, 'OTP does not match', null, StatusCodes.BAD_REQUEST);
    }

    if (otpExpired) {
      return APIResponse.error(res, 'OTP Expired', null, StatusCodes.BAD_REQUEST);
    }

    const token = generateToken(user);
    user.forgotPasswordOTP = '';
    user.forgotPasswordOTPExpiresAt = null;
    await user.save();
    return APIResponse.success(res, 'OTP verified successfully', { token }, StatusCodes.OK);
  } catch (error: any) {
    return APIResponse.error(res, 'Internal server error', error, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const verifyTwoFactorAuthentication = async (req: Request, res: Response) => {
  try {
    const { identifier, otp } = req.query;
    // Find user by username, email, or phone
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }, { phone: identifier }],
    }).populate({
      path: 'role',
    });

    if (!user) {
      return APIResponse.error(res, 'User not found', null, StatusCodes.NOT_FOUND);
    }

    if (!user.TFAOTP) {
      return APIResponse.error(res, 'Two Factor Authentication not enabled', null, StatusCodes.BAD_REQUEST);
    }

    const validOTP = await isValidOTP(otp as string, user.TFAOTP);

    if (!validOTP) {
      return APIResponse.error(res, 'OTP does not match', null, StatusCodes.BAD_REQUEST);
    }

    if (validOTP) {
      user.TFAOTP = '';
      const token = generateToken(user);
      await user.save();

      return APIResponse.success(
        res,
        'Two Factor Authentication verified successfully',
        {
          token,
          TFAEnabled: user.TFAEnabled,
        },
        StatusCodes.OK
      );
    }
  } catch (error: any) {
    return APIResponse.error(res, 'Internal server error', error, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const resendTFAOTP = async (req: Request, res: Response) => {
  const { identifier } = req.query;
  try {
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }, { phone: identifier }],
    });

    if (!user) {
      return APIResponse.error(res, 'User not found', null, StatusCodes.NOT_FOUND);
    }

    if (user.status === UserStatus.DELETED) {
      return APIResponse.error(res, 'User not found', null, StatusCodes.NOT_FOUND);
    }

    if (user.status === UserStatus.BLOCKED) {
      return APIResponse.error(res, 'User is blocked', null, StatusCodes.FORBIDDEN);
    }

    if (!user.TFAEnabled) {
      return APIResponse.error(res, 'Two Factor Authentication not enabled', null, StatusCodes.FORBIDDEN);
    }

    if (!user.TFAOTP) {
      return APIResponse.error(res, 'First verify your credentials', null, StatusCodes.UNAUTHORIZED);
    }

    const otp = generateOTP(6);

    console.log({ TFAOTP: otp });

    // TODO: send the OTP to the user's email

    user.TFAOTP = await hashOTP(otp);

    await user.save();

    return APIResponse.success(res, 'OTP sent successfully');
  } catch (error: any) {
    return APIResponse.error(res, 'Internal server error', error, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const loginWithGoogle = async (req: Request, res: Response) => {
  try {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = {
      access_type: 'offline',
      client_id: env.GOOGLE_CLIENT_ID,
      prompt: 'consent',
      redirect_uri: `${env.BACKEND_BASE_URL}${API_ROUTES.AUTH}${AUTH_PATHS.GOOGLE_OAUTH_CALLBACK}`,
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ].join(' '),
    };
    const qs = new URLSearchParams(options);
    const url = `${rootUrl}?${qs.toString()}`;

    return APIResponse.success(res, 'Login with Google', { url }, StatusCodes.OK);
  } catch (error: any) {
    return APIResponse.error(res, 'Internal server error', error, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const googleOAuthCallBack = async (req: Request, res: Response) => {
  try {
    const { code } = req.query;

    const result = await getGoogleCode(code as string);

    if (!result) {
      return APIResponse.error(res, 'Invalid token', null, StatusCodes.UNAUTHORIZED);
    }

    const { id_token } = result;

    const googleUser = jwt.decode(id_token) as JwtPayload;
    const email = googleUser.email as string;
    const name = googleUser.name as string;
    const image = googleUser.picture as string;

    if (!email || !name) {
      return APIResponse.error(res, 'Invalid token', null, StatusCodes.UNAUTHORIZED);
    }
    // Rest of the code...
    const existingUser: IUserDoc | null = await User.findOne({
      $or: [{ email: email }],
    });
    if (existingUser && existingUser?.status === UserStatus.BLOCKED) {
      return APIResponse.error(res, 'User is Blocked', null, StatusCodes.FORBIDDEN);
    }

    if (existingUser) {
      if (!existingUser?.emailVerified) {
        try {
          await existingUser.updateOne({ emailVerified: true });
        } catch (error) {
          return APIResponse.error(res, 'Internal server error', error, StatusCodes.INTERNAL_SERVER_ERROR);
        }
      }
      const token = generateToken({ ...existingUser.toObject(), emailVerified: true });
      return res.redirect(`${env.FRONTEND_URL}/sign-in?token=${token}`);
    }
    const userRole = await Role.findOne({ name: UserRoles.USER });
    if (!userRole) {
      return APIResponse.error(res, 'User role not found', null, StatusCodes.NOT_FOUND);
    }

    let user = null;
    // Send email to user with OTP if user is not created by the admin (Hint: there will be no user in the req.user object if the user is not created by the admin)
    if (!existingUser) {
      const [firstName, ...rest] = name.split(' ');
      const lastName = rest.join(' ');
      const newUser = new User({
        firstName: firstName,
        lastName: lastName,
        username: email,
        email: email,
        emailVerified: true,
        role: userRole._id,
        status: UserStatus.ACTIVE,
      });

      const defaultWorkspace = new Workspace({
        name: 'Default Workspace',
        slug: `default-${newUser._id}`,
        ownerId: newUser._id,
        members: [],
      });
      if (image) {
        const key = await uploadGoogleProfileImage(image, env.R2_BUCKET_NAME as any);
        newUser.profilePicture = key;
      }

      const workspace = await defaultWorkspace.save();

      if (!workspace) {
        return APIResponse.error(res, 'Error while registering', null, StatusCodes.INTERNAL_SERVER_ERROR);
      }

      newUser.workspaces = [workspace!._id as Types.ObjectId];
      newUser.googleOAuth = true;
      user = await newUser.save();

      const token = generateToken(user);
      return res.redirect(`${env.FRONTEND_URL}/sign-up?token=${token}`);
    } else {
      const [firstName, ...rest] = name.split(' ');
      const lastName = rest.join(' ');

      (existingUser as IUserDoc).firstName = firstName;
      (existingUser as IUserDoc).lastName = lastName;
      (existingUser as IUserDoc).username = email;
      (existingUser as IUserDoc).email = email;
      (existingUser as IUserDoc).role = userRole._id as Types.ObjectId;
      (existingUser as IUserDoc).status = UserStatus.ACTIVE;
      (existingUser as IUserDoc).emailVerified = true;
      (existingUser as IUserDoc).phone = '';
      (existingUser as IUserDoc).TFAEnabled = false;

      const defaultWorkspace = new Workspace({
        name: 'Default Workspace',
        slug: 'default',
        ownerId: (existingUser as IUserDoc)._id,
        members: [],
        socialMediaProfiles: [],
      });

      const workspace = await defaultWorkspace.save();

      if (!workspace) {
        return APIResponse.error(res, 'Error while registering', null, StatusCodes.INTERNAL_SERVER_ERROR);
      }

      (existingUser as IUserDoc).workspaces = [workspace?.id || workspace?._id];
      (existingUser as IUserDoc).googleOAuth = true;
      user = await (existingUser as IUserDoc).save();

      const token = generateToken(user);

      return res.redirect(`${env.FRONTEND_URL}/sign-up?token=${token}`);
    }
  } catch (error: any) {
    console.log(error);
    return APIResponse.error(res, 'Something went wrong', error, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
