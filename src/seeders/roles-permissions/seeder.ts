import { AdminPermissions, UserRoles } from '@/common/constants/enums';
import { Permission } from '@/common/models/permission';
import { Role } from '@/common/models/role';

const defaultPermissions = [
  // Admin permissions
  { name: AdminPermissions.MANAGE_USERS, description: 'Manage users' },
  { name: AdminPermissions.CREATE_ROLE, description: 'Create roles' },
  { name: AdminPermissions.CREATE_USER, description: 'Create users' },
  { name: AdminPermissions.UPDATE_USER, description: 'Update users' },
  { name: AdminPermissions.DELETE_USER, description: 'Delete users' },
  { name: AdminPermissions.BLOCK_USER, description: 'Block users' },
  { name: AdminPermissions.GET_ALL_USERS, description: 'Get all users' },
  { name: AdminPermissions.UPDATE_ROLE, description: 'Update roles' },
  { name: AdminPermissions.DELETE_ROLE, description: 'Delete roles' },
  { name: AdminPermissions.GET_ROLE, description: 'Get role' },
  { name: AdminPermissions.CREATE_PERMISSION, description: 'Create permissions' },
  { name: AdminPermissions.READ_ALL_PERMISSIONS, description: 'Read all permissions' },
  { name: AdminPermissions.READ_PERMISSION, description: 'Read permission' },
  { name: AdminPermissions.UPDATE_PERMISSION, description: 'Update permission' },
  { name: AdminPermissions.DELETE_PERMISSION, description: 'Delete permission' },
  { name: AdminPermissions.READ_ALL_ROLES, description: 'Read all roles' },
  { name: AdminPermissions.ASSIGN_NEW_PERMISSION_ROLE, description: 'Assign permission to role' },
  { name: AdminPermissions.CHANGE_USER_ROLE, description: 'Change user role' },
];

const defaultRoles = [
  {
    name: UserRoles.ADMIN,
    description: 'Administrator with full access',
    permissions: [
      AdminPermissions.MANAGE_USERS,
      AdminPermissions.CREATE_ROLE,
      AdminPermissions.CREATE_USER,
      AdminPermissions.UPDATE_USER,
      AdminPermissions.DELETE_USER,
      AdminPermissions.BLOCK_USER,
      AdminPermissions.GET_ALL_USERS,
      AdminPermissions.UPDATE_ROLE,
      AdminPermissions.DELETE_ROLE,
      AdminPermissions.GET_ROLE,
      AdminPermissions.CREATE_PERMISSION,
      AdminPermissions.READ_ALL_PERMISSIONS,
      AdminPermissions.READ_PERMISSION,
      AdminPermissions.UPDATE_PERMISSION,
      AdminPermissions.DELETE_PERMISSION,
      AdminPermissions.READ_ALL_ROLES,
      AdminPermissions.ASSIGN_NEW_PERMISSION_ROLE,
      AdminPermissions.CHANGE_USER_ROLE,
    ],
  },
  {
    name: UserRoles.SUB_ADMIN,
    description: 'Sub-administrator with limited admin access',
    permissions: [AdminPermissions.GET_ALL_USERS, AdminPermissions.READ_ALL_ROLES, AdminPermissions.READ_ROLE],
  },
  {
    name: UserRoles.USER,
    description: 'Regular user with basic access',
    permissions: [],
  },
];

export const seedRolesAndPermissions = async () => {
  const permissions = [];
  const roles = [];

  // Seed permissions
  console.log('\n📝 Seeding permissions...');
  for (const permData of defaultPermissions) {
    const existingPermission = await Permission.findOne({ name: permData.name });
    if (existingPermission) {
      console.log(`⏭️  Permission ${permData.name} already exists, skipping...`);
      permissions.push(existingPermission);
      continue;
    }

    const permission = new Permission(permData);
    await permission.save();
    permissions.push(permission);
    console.log(`✅ Created permission: ${permData.name}`);
  }

  // Seed roles
  console.log('\n📝 Seeding roles...');
  for (const roleData of defaultRoles) {
    const existingRole = await Role.findOne({ name: roleData.name });
    if (existingRole) {
      console.log(`⏭️  Role ${roleData.name} already exists, skipping...`);
      roles.push(existingRole);
      continue;
    }

    // Map permission names to permission IDs
    const permissionIds = roleData.permissions
      .map((permName) => permissions.find((p) => p.name === permName)?._id)
      .filter((id) => id !== undefined);

    const role = new Role({
      name: roleData.name,
      description: roleData.description,
      permissions: permissionIds,
    });

    await role.save();
    roles.push(role);
    console.log(`✅ Created role: ${roleData.name} with ${permissionIds.length} permissions`);
  }

  return { permissions, roles };
};


