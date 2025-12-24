import express, { Router } from 'express';

import {
  changePasswordUsingCurrentPassword,
  deleteMe,
  disableTwoFactorAuthentication,
  enableTwoFactorAuthentication,
  getMe,
  requestEmailVerificationOtp,
  requestPhoneVerificationOTP,
  updateDescribedUserRole,
  updateMe,
  updatePassword,
  updatePasswordRequest,
  uploadProfilePic,
  verifyEmailByOTP,
  verifyPhoneByOTP,
} from '@/apis/users/controllers';
import { authenticate, authorize } from '@/common/middleware/user';
import { validateRequest } from '@/common/utils/httpHandlers';
import { upload } from '@/common/utils/uploadFile';

import {
  ChangePasswordValidationSchema,
  DeleteUserValidationSchema,
  OTPValidationSchema,
  updateDescribedUserRoleValidateSchema,
  UpdatePasswordValidationSchema,
  UpdateUserValidationSchema,
} from './validationSchemas';

export const USER_PATHS = {
  GET_ME: '/me',
  UPDATE_ME: '/me',
  DELETE_ME: '/me',
  REQUEST_UPDATE_PASSWORD: '/me/request-update-password',
  UPDATE_PASSWORD: '/me/update-password',
  UPLOAD_PROFILE_PIC: '/me/profile-pic',
  ENABLE_TWO_FACTOR_AUTHENTICATION: '/me/enable-tfa',
  DISABLE_TWO_FACTOR_AUTHENTICATION: '/me/disable-tfa',
  REQUEST_PHONE_VERIFICATION_OTP: '/request-phone-verification-otp',
  REQUEST_EMAIL_VERIFICATION_OTP: '/request-email-verification-otp',
  VERIFY_EMAIL: '/verify-email',
  VERIFY_PHONE: '/verify-phone',
  CHANGE_PASSWORD_USING_CURRENT_PASSWORD: '/change-password-using-current-password',
  DESCRIBED_ROLES: '/described-roles',
};

export const usersRouter: Router = (() => {
  const router = express.Router();

  router.get(USER_PATHS.GET_ME, authenticate, authorize(), getMe);

  router.put(USER_PATHS.UPDATE_ME, authenticate, authorize(), validateRequest(UpdateUserValidationSchema), updateMe);

  router.delete(USER_PATHS.DELETE_ME, authenticate, authorize(), validateRequest(DeleteUserValidationSchema), deleteMe);

  router.post(USER_PATHS.REQUEST_UPDATE_PASSWORD, authenticate, authorize(), updatePasswordRequest);

  router.put(
    USER_PATHS.UPDATE_PASSWORD,
    authenticate,
    authorize(),
    validateRequest(UpdatePasswordValidationSchema),
    updatePassword
  );

  router.post(USER_PATHS.UPLOAD_PROFILE_PIC, authenticate, authorize(), upload.single('image'), uploadProfilePic);

  router.put(USER_PATHS.ENABLE_TWO_FACTOR_AUTHENTICATION, authenticate, authorize(), enableTwoFactorAuthentication);

  router.put(USER_PATHS.DISABLE_TWO_FACTOR_AUTHENTICATION, authenticate, authorize(), disableTwoFactorAuthentication);

  router.post(USER_PATHS.REQUEST_EMAIL_VERIFICATION_OTP, authenticate, requestEmailVerificationOtp);

  router.post(USER_PATHS.VERIFY_EMAIL, authenticate, validateRequest(OTPValidationSchema), verifyEmailByOTP);

  router.put(USER_PATHS.REQUEST_PHONE_VERIFICATION_OTP, authenticate, requestPhoneVerificationOTP);

  router.put(USER_PATHS.VERIFY_PHONE, authenticate, validateRequest(OTPValidationSchema), verifyPhoneByOTP);

  router.put(
    USER_PATHS.CHANGE_PASSWORD_USING_CURRENT_PASSWORD,
    authenticate,
    authorize(),
    validateRequest(ChangePasswordValidationSchema),
    changePasswordUsingCurrentPassword
  );

  router.put(
    USER_PATHS.DESCRIBED_ROLES,
    authenticate,
    authorize(),
    validateRequest(updateDescribedUserRoleValidateSchema),
    updateDescribedUserRole
  );

  return router;
})();
