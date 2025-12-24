import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';

import { DB_MODELS } from '@/common/constants/common';
import { AdminPermissions, SubAdminPermissions } from '@/common/constants/enums';
import { IRoleDoc } from '@/common/models/role';
import { IUserPayload, User } from '@/common/models/user';
import { env } from '@/common/utils/envConfig';
import { APIResponse } from '@/common/utils/response';

const { JWT_SECRET_KEY } = env;

// Authenticate user by token
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return APIResponse.error(res, 'No token provided', null, StatusCodes.UNAUTHORIZED);
  }
  jwt.verify(token, JWT_SECRET_KEY as string, (err: any, user: any) => {
    if (err) {
      return APIResponse.error(res, 'Invalid token', null, StatusCodes.UNAUTHORIZED);
    }

    req.user = user as IUserPayload;
    next();
  });
};

// Check user role and permissions
export const authorize = (requiredPermission?: AdminPermissions | SubAdminPermissions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req?.user?.id).populate({
      path: 'role',
      populate: { path: 'permissions', model: DB_MODELS.PERMISSION, select: '-__v' },
    });

    if (!user) {
      return APIResponse.error(res, 'User not found', null, StatusCodes.UNAUTHORIZED);
    }

    if (user.email && !user.emailVerified) {
      return APIResponse.error(res, 'Email not verified', null, StatusCodes.FORBIDDEN);
    }

    if (user.phone && !user.phoneVerified) {
      return APIResponse.error(res, 'Phone not verified', null, StatusCodes.FORBIDDEN);
    }

    const role = user.role as any as IRoleDoc;
    if (!role) {
      return APIResponse.error(res, 'Role not found', null, StatusCodes.FORBIDDEN);
    }

    const hasPermission = requiredPermission
      ? role.permissions.some((perm: any) => perm.name === requiredPermission)
      : true;
    if (!hasPermission) {
      return APIResponse.error(
        res,
        'Access Denied, you might not have permission to perform this action',
        null,
        StatusCodes.FORBIDDEN
      );
    }

    next();
  };
};
