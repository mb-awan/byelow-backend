import bcrypt from 'bcrypt';

import { UserRoles, UserStatus } from '@/common/constants/enums';
import { Role } from '@/common/models/role';
import { User } from '@/common/models/user';
import { env } from '@/common/utils/envConfig';

export interface SeedUser {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  emailVerified: boolean;
  status: UserStatus;
}

const defaultUsers: SeedUser[] = [
  {
    username: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@byelow.com',
    password: 'Admin123!@#',
    emailVerified: true,
    status: UserStatus.ACTIVE,
  },
  {
    username: 'demo',
    firstName: 'Demo',
    lastName: 'User',
    email: 'demo@byelow.com',
    password: 'Demo123!@#',
    emailVerified: true,
    status: UserStatus.ACTIVE,
  },
  {
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@byelow.com',
    password: 'Test123!@#',
    emailVerified: true,
    status: UserStatus.ACTIVE,
  },
];

export const seedUsers = async () => {
  const users = [];

  // Get default user role
  const userRole = await Role.findOne({ name: UserRoles.USER });
  if (!userRole) {
    throw new Error('User role not found. Please seed roles and permissions first.');
  }

  // Get admin role for admin user
  const adminRole = await Role.findOne({ name: UserRoles.ADMIN });

  for (const userData of defaultUsers) {
    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      console.log(`⏭️  User ${userData.email} already exists, skipping...`);
      users.push(existingUser);
      continue;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, env.BCRYPT_SALT_ROUNDS);

    // Determine role - admin user gets admin role, others get user role
    const roleId = userData.email === 'admin@byelow.com' && adminRole ? adminRole._id : userRole._id;

    // Create user
    const user = new User({
      ...userData,
      password: hashedPassword,
      role: roleId,
      phone: null,
      currentAddress: null,
      postalAddress: null,
      phoneVerified: false,
      profilePicture: null,
      googleOAuth: false,
      notificationType: ['inApp'],
      TFAEnabled: false,
      TFAOTP: null,
      emailVerificationOTP: null,
      emailVerificationOtpExpiresAt: null,
      phoneVerificationOTP: null,
      forgotPasswordOTP: null,
      passwordUpdateRequested: false,
      forgotPasswordOTPExpiresAt: null,
      describedRole: [],
      workspaces: [],
    });

    await user.save();
    users.push(user);
    console.log(
      `✅ Created user: ${userData.email} with role: ${userData.email === 'admin@byelow.com' ? 'admin' : 'user'}`
    );
  }

  return users;
};
