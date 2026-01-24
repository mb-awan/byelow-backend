import console from 'node:console';

import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import moment from 'moment';

import { UserRoles, UserStatus } from '@/common/constants/enums';
import { Permission } from '@/common/models/permission';
import { User } from '@/common/models/user';
import { generateToken, hashPassword, isValidOTP, isValidPassword } from '@/common/utils/auth';
import { sendVerificationEmailOTP } from '@/common/utils/emailService';
import { env } from '@/common/utils/envConfig';
import { generateOTP } from '@/common/utils/generateOTP';
import { deleteFileFromR2 } from '@/common/utils/r2';
import { APIResponse } from '@/common/utils/response';
import { logger } from '@/server';

const USER_RESPONSE_VALUES =
  'firstName profilePicture lastName TFAEnabled username phone email googleOAuth emailVerified phoneVerified status createdAt updatedAt';

// get user
export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req?.user?.id) {
      return APIResponse.error(res, 'Not authorized', null, StatusCodes.UNAUTHORIZED);
    }

    const id = req.user.id;

    const user = await User.findById(id)
      .populate({
        path: 'role',
        select: '-__v',
        populate: { path: 'permissions', model: Permission, select: '-__v' },
      })
      .populate({ path: 'workspaces', select: '-__v' })
      .select(USER_RESPONSE_VALUES);

    console.log({ user });

    if (!user) {
      return APIResponse.error(res, 'Not authorized', null, StatusCodes.UNAUTHORIZED);
    }

    if (user.status === UserStatus.DELETED) {
      return APIResponse.error(res, 'Not authorized', null, StatusCodes.UNAUTHORIZED);
    }

    if (user.status === UserStatus.BLOCKED) {
      return APIResponse.error(res, 'Not authorized', null, StatusCodes.FORBIDDEN);
    }
    return APIResponse.success(res, 'User fetched successfully', user);
  } catch (err) {
    return APIResponse.error(res, 'Internal server error', err, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// update user
export const updateMe = async (req: Request, res: Response) => {
  try {
    if (!req?.user?.id) {
      return APIResponse.error(res, 'Not authorized', null, StatusCodes.UNAUTHORIZED);
    }

    const id = req.user.id;

    const user = await User.findById(id);
    if (!user || user.status === UserStatus.DELETED) {
      return APIResponse.error(res, 'Not authorized', null, StatusCodes.UNAUTHORIZED);
    }

    if (user.status === UserStatus.BLOCKED) {
      return APIResponse.error(res, 'Not authorized', null, StatusCodes.FORBIDDEN);
    }

    if (req.body.username && !req.body.phone) {
      const alreadyExists = await User.findOne({ username: req.body.username });
      if (alreadyExists && alreadyExists.id.toString() !== id) {
        return APIResponse.error(res, 'Username already exists', null, StatusCodes.BAD_REQUEST);
      }
    } else if (req.body.phone && !req.body.username) {
      const alreadyExists = await User.findOne({ phone: req.body.phone });
      if (alreadyExists && alreadyExists.id.toString() !== id) {
        return APIResponse.error(res, 'Phone number already exists', null, StatusCodes.BAD_REQUEST);
      }
    } else if (req.body.phone && req.body.username) {
      const alreadyExists = await User.findOne({
        $or: [{ email: req.body.email }, { username: req.body.username }, { phone: req?.body?.phone }],
      });
      if (alreadyExists && alreadyExists.id.toString() !== id) {
        return APIResponse.error(res, 'User already exists', null, StatusCodes.BAD_REQUEST);
      }
    }

    const updatedProperties = {};
    Object.keys(req.body).forEach((key) => {
      (updatedProperties as any)[key] = req.body[key];
    });
    console.log({ updatedProperties });
    const updateUser = await User.findByIdAndUpdate(id, updatedProperties, { new: true }).select(USER_RESPONSE_VALUES);

    return APIResponse.success(res, 'User updated successfully', updateUser);
  } catch (e) {
    return APIResponse.error(res, 'Internal server error', e, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// delete user
export const deleteMe = async (req: Request, res: Response) => {
  try {
    if (!req?.user?.id) {
      return APIResponse.error(res, 'Not authorized', null, StatusCodes.UNAUTHORIZED);
    }
    const id = req.user.id;

    const user = await User.findByIdAndUpdate(id, { status: 'deleted' }, { new: true }).select(USER_RESPONSE_VALUES);
    if (!user) {
      return APIResponse.error(res, 'Not authorized', null, StatusCodes.UNAUTHORIZED);
    }
    if (!(user?.email === req.body.email || user?.username === req.body.username || user?._id === req.body.userId)) {
      return APIResponse.error(res, 'Not authorized', null, StatusCodes.UNAUTHORIZED);
    }

    return APIResponse.success(res, 'User deleted successfully', null);
  } catch (e) {
    return APIResponse.error(res, 'Internal server error', e, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// update password request

export const updatePasswordRequest = async (req: Request, res: Response) => {
  try {
    const id = req?.user?.id;

    const user = await User.findById(id);

    if (!user) {
      return APIResponse.error(res, 'Not authorized', null, StatusCodes.UNAUTHORIZED);
    }

    if (user.status === UserStatus.DELETED) {
      return APIResponse.error(res, 'Not authorized', null, StatusCodes.UNAUTHORIZED);
    }

    if (user.status === UserStatus.BLOCKED) {
      return APIResponse.error(res, 'This account is blocked', null, StatusCodes.FORBIDDEN);
    }

    if (((user.role as any).name as string) === UserRoles.ADMIN) {
      return APIResponse.error(res, 'Admins cannot update password', null, StatusCodes.FORBIDDEN);
    }

    await user.save();

    return APIResponse.success(res, 'Password update request sent successfully');
  } catch (err) {
    return APIResponse.error(res, 'Internal server error', err, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// update Password

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const id = req?.user?.id;
    const user = await User.findById(id);
    const { password } = req.body;
    if (!user) {
      return APIResponse.error(res, 'Not authorized', null, StatusCodes.UNAUTHORIZED);
    }
    if (user.status === UserStatus.DELETED) {
      return APIResponse.error(res, 'Not authorized', null, StatusCodes.UNAUTHORIZED);
    }

    if (user.status === UserStatus.BLOCKED) {
      return APIResponse.error(res, 'User is blocked', null, StatusCodes.FORBIDDEN);
    }

    const hashedPassword = await hashPassword(password);
    user.password = hashedPassword;
    if (user.googleOAuth) {
      user.googleOAuth = false;
    }

    await user.save();
    return APIResponse.success(res, 'Password updated successfully');
  } catch (err) {
    console.log(err);
    return APIResponse.error(res, 'Internal server error', err, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// upload profile picture
export const uploadProfilePic = async (req: Request, res: Response) => {
  const id = req?.user?.id;

  try {
    const user = await User.findById(id);
    const { key } = req.body;
    if (!user) {
      return APIResponse.error(res, 'User not found', null, StatusCodes.NOT_FOUND);
    }
    if (!key) {
      return APIResponse.error(res, 'Image key is required', null, StatusCodes.BAD_REQUEST);
    }

    if (user.status === UserStatus.DELETED) {
      return APIResponse.error(res, 'User not found', null, StatusCodes.UNAUTHORIZED);
    }

    if (user.status === UserStatus.BLOCKED) {
      return APIResponse.error(res, 'User is blocked', null, StatusCodes.FORBIDDEN);
    }

    if (user.profilePicture !== null && user.profilePicture !== key) {
      console.log(user.profilePicture);
      try {
        await deleteFileFromR2(user.profilePicture);
      } catch (err) {
        console.error('Failed to delete old image from R2:', err);
      }
    }

    user.profilePicture = key.toString();
    await user.save();
    console.log(user.profilePicture);
    return APIResponse.success(res, 'Profile picture uploaded successfully', { profilePicture: key });
  } catch (error) {
    console.log(error);
    return APIResponse.error(res, 'Internal server error', error, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
// unable two factor authentication
export const enableTwoFactorAuthentication = async (req: Request, res: Response) => {
  const id = req?.user?.id;
  const user = await User.findById(id);

  try {
    if (!user) {
      return APIResponse.error(res, 'User not found', null, StatusCodes.NOT_FOUND);
    }
    if (user.status === UserStatus.DELETED) {
      return APIResponse.error(res, 'Account not found', null, StatusCodes.UNAUTHORIZED);
    }

    if (user.status === UserStatus.BLOCKED) {
      return APIResponse.error(res, 'User is blocked', null, StatusCodes.FORBIDDEN);
    }

    user.TFAEnabled = true;

    await user.save();
    return APIResponse.success(res, 'Two-factor authentication enabled successfully');
  } catch (error) {
    console.error('Error while enabling TFA', error);
    return APIResponse.error(res, 'Error enabling TFA', error, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const disableTwoFactorAuthentication = async (req: Request, res: Response) => {
  const id = req?.user?.id;
  const user = await User.findById(id);

  try {
    if (!user) {
      return APIResponse.error(res, 'User not found', null, StatusCodes.NOT_FOUND);
    }
    if (user.status === UserStatus.DELETED) {
      return APIResponse.error(res, 'Account not found', null, StatusCodes.UNAUTHORIZED);
    }

    if (user.status === UserStatus.BLOCKED) {
      return APIResponse.error(res, 'User is blocked', null, StatusCodes.FORBIDDEN);
    }

    user.TFAOTP = '';
    user.TFAEnabled = false;

    await user.save();
    return APIResponse.success(res, 'Two-factor authentication disabled successfully');
  } catch (error) {
    console.error('Error while diabling TFA:', error);
    return APIResponse.error(res, 'Error disabling TFA', error, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// generate email verification OTP controller
export const requestEmailVerificationOtp = async (req: Request, res: Response) => {
  const { id } = req.user;
  const user = await User.findById(id);

  try {
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
    // TODO: Send the OTP to the user's email

    const hashedOTP = await hashPassword(otp);
    user.emailVerificationOTP = hashedOTP;
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
      logger.info({ emailOTPOnRegisterResend: otp });
    }

    return APIResponse.success(res, 'OTP sent successfully');
  } catch (error) {
    console.error('Error requesting OTP:', error);
    return APIResponse.error(res, 'Internal server error', error, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// generate phone verification OTP controller
export const requestPhoneVerificationOTP = async (req: Request, res: Response) => {
  const { id } = req.user;

  if (!id) {
    return APIResponse.error(res, 'Not Authorized', null, StatusCodes.UNAUTHORIZED);
  }

  try {
    // Find the user by ID
    const user = await User.findById(id);
    if (!user) {
      return APIResponse.error(res, 'User not found', null, StatusCodes.NOT_FOUND);
    }

    if (!user.phone) {
      return APIResponse.error(res, 'Phone number not found', null, StatusCodes.NOT_FOUND);
    }

    if (user.phoneVerified) {
      return APIResponse.error(res, 'Phone number already verified', null, StatusCodes.BAD_REQUEST);
    }

    const phoneOfOtherUser = await User.findOne({ phone: user.phone, _id: { $ne: user._id }, phoneVerified: true });

    if (phoneOfOtherUser) {
      return APIResponse.error(res, 'Phone number already exists', null, StatusCodes.BAD_REQUEST);
    }

    // Generate a 5 digit OTP
    const otp = generateOTP(6);
    console.log({ phoneOTP: otp });

    //TODO: Send the OTP to the user's phone number

    const hashedOTP = await hashPassword(otp);
    user.phoneVerificationOTP = hashedOTP;

    await user.save();
    return APIResponse.success(res, 'OTP sent successfully');
  } catch (error: any) {
    console.error(error.message);
    return APIResponse.error(res, 'Internal server error', error, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// verify email by OTP Controller
export const verifyEmailByOTP = async (req: Request, res: Response) => {
  const { otp } = req.body;
  const { id } = req.user;

  if (!otp) {
    return APIResponse.error(res, 'OTP is required', null, StatusCodes.BAD_REQUEST);
  }

  try {
    const user = await User.findById(id).populate({
      path: 'role',
    });

    if (!user) {
      return APIResponse.error(res, 'User not found', null, StatusCodes.NOT_FOUND);
    }

    if (!user.emailVerificationOTP || !user.emailVerificationOtpExpiresAt) {
      return APIResponse.error(res, 'OTP is Invalid Or Expired', null, StatusCodes.BAD_REQUEST);
    }

    const otpExpired = moment().isAfter(moment(user.emailVerificationOtpExpiresAt));

    const validOTP = await isValidOTP(otp as string, user.emailVerificationOTP as string);

    if (validOTP) {
      if (otpExpired) {
        return APIResponse.error(res, 'OTP is Expired', null, StatusCodes.BAD_REQUEST);
      }
      user.emailVerified = true;
      user.emailVerificationOTP = '';
      user.emailVerificationOtpExpiresAt = null;
      await user.save();

      const token = generateToken(user);
      return APIResponse.success(res, 'Email verified successfully', { token }, StatusCodes.OK);
    } else {
      return APIResponse.error(res, 'Invalid OTP', null, StatusCodes.BAD_REQUEST);
    }
  } catch (error: any) {
    return APIResponse.error(res, 'Internal server error', error, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// verify phone by OTP Controller
export const verifyPhoneByOTP = async (req: Request, res: Response) => {
  const { otp } = req.query;
  const { id } = req.user;

  if (!otp) {
    return APIResponse.error(res, 'OTP is required', null, StatusCodes.BAD_REQUEST);
  }

  if (!id) {
    return APIResponse.error(res, 'Not Authorized', null, StatusCodes.UNAUTHORIZED);
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return APIResponse.error(res, 'User not found', null, StatusCodes.NOT_FOUND);
    }

    const validOTP = await isValidOTP(otp as string, user.phoneVerificationOTP as string);
    if (validOTP) {
      user.phoneVerified = true;
      user.phoneVerificationOTP = '';
      await user.save();

      return APIResponse.success(res, 'Phone verified successfully');
    } else {
      return APIResponse.error(res, 'Invalid OTP', null, StatusCodes.BAD_REQUEST);
    }
  } catch (error: any) {
    console.error(error.message);
    return APIResponse.error(res, 'Internal server error', error, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// Change Password With Current Password

export const changePasswordUsingCurrentPassword = async (req: Request, res: Response) => {
  try {
    const id = req?.user?.id;
    const user = await User.findById(id);
    if (!user) {
      return APIResponse.error(res, 'Not authorized', null, StatusCodes.UNAUTHORIZED);
    }
    if (user.status === UserStatus.DELETED) {
      return APIResponse.error(res, 'Not authorized', null, StatusCodes.UNAUTHORIZED);
    }

    if (user.status === UserStatus.BLOCKED) {
      return APIResponse.error(res, 'User is blocked', null, StatusCodes.FORBIDDEN);
    }
    if (user.googleOAuth) {
      user.password = await hashPassword(req.body.password);
      user.googleOAuth = false;
      await user.save();
      return APIResponse.success(res, 'Password updated successfully');
    }

    const validPassword = await isValidPassword(req.body.currentPassword, user.password);

    if (!validPassword) {
      return APIResponse.error(
        res,
        "Oops, the password you entered doesn't match our records",
        null,
        StatusCodes.BAD_REQUEST
      );
    }

    user.password = await hashPassword(req.body.password);

    await user.save();
    return APIResponse.success(res, 'Password updated successfully');
  } catch (err) {
    return APIResponse.error(res, 'Internal server error', err, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const updateDescribedUserRole = async (req: Request, res: Response) => {
  try {
    const id = req?.user?.id;
    const { roles } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return APIResponse.error(res, 'Not authorized', null, StatusCodes.UNAUTHORIZED);
    }

    if (user.status === UserStatus.DELETED || user.status === UserStatus.BLOCKED) {
      const errorMessage = user.status === UserStatus.DELETED ? 'Not authorized' : 'User is blocked';
      return APIResponse.error(res, errorMessage, null, StatusCodes.FORBIDDEN);
    }

    const uniqueRoles = Array.from(new Set(roles));
    user.set('describedRole', uniqueRoles);
    await user.save();

    return APIResponse.success(res, 'User roles updated successfully', {
      describedRole: user.get('describedRole'),
    });
  } catch (error) {
    console.error('Error updating user roles:', error);
    return APIResponse.error(res, 'Internal server error', error, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
