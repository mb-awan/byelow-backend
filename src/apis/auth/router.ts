import express, { Router } from 'express';

import {
  googleOAuthCallBack,
  loginUser,
  loginWithGoogle,
  registerUser,
  requestForgotPasswordOTP,
  resendTFAOTP,
  validateEmail,
  validateUsername,
  verifyforgotPasswordOTP,
  verifyTwoFactorAuthentication,
} from '@/apis/auth/controllers';
import { validateRequest } from '@/common/utils/httpHandlers';

import {
  EmailValidationShema,
  LoginUserValidationSchema,
  RegisterUserValidationSchema,
  RequestForgotPasswordValidationSchema,
  ResendTFAOTPValidationSchema,
  UsernameValidationShema,
  VerifyForgotPasswordValidationSchema,
  VerifyTwoFactorAuthenticationValidationSchema,
} from './validationSchemas';

export const AUTH_PATHS = {
  REGISTER: '/sign-up',
  LOGIN: '/sign-in',
  VERIFY_USERNAME: '/verify-username',
  VERIFY_EMAIL: '/verify-email',
  REQUEST_FORGOT_PASSWORD_OTP: '/request-forgot-password-otp',
  VERIFY_FORGOT_PASSWORD_OTP: '/verify-forgot-password-otp',
  VERIFY_TWO_FACTOR_AUTHENTICATION: '/verify-tfa-otp',
  RESEND_TFA_OTP: '/resend-tfa-otp',
  GOOGLE_LOGIN: '/google-login',
  GOOGLE_OAUTH_CALLBACK: '/google-oauth2callback',
};

export const authRouter: Router = (() => {
  const router = express.Router();

  router.post(AUTH_PATHS.REGISTER, validateRequest(RegisterUserValidationSchema), registerUser);

  router.post(AUTH_PATHS.LOGIN, validateRequest(LoginUserValidationSchema), loginUser);

  router.get(AUTH_PATHS.VERIFY_USERNAME, validateRequest(UsernameValidationShema), validateUsername);

  router.get(AUTH_PATHS.VERIFY_EMAIL, validateRequest(EmailValidationShema), validateEmail);

  router.put(
    AUTH_PATHS.REQUEST_FORGOT_PASSWORD_OTP,
    validateRequest(RequestForgotPasswordValidationSchema),
    requestForgotPasswordOTP
  );

  router.get(
    AUTH_PATHS.VERIFY_FORGOT_PASSWORD_OTP,
    validateRequest(VerifyForgotPasswordValidationSchema),
    verifyforgotPasswordOTP
  );

  router.post(
    AUTH_PATHS.VERIFY_TWO_FACTOR_AUTHENTICATION,
    validateRequest(VerifyTwoFactorAuthenticationValidationSchema),
    verifyTwoFactorAuthentication
  );

  router.get(AUTH_PATHS.RESEND_TFA_OTP, validateRequest(ResendTFAOTPValidationSchema), resendTFAOTP);

  router.post(AUTH_PATHS.GOOGLE_LOGIN, loginWithGoogle);

  router.get(AUTH_PATHS.GOOGLE_OAUTH_CALLBACK, googleOAuthCallBack);

  return router;
})();
