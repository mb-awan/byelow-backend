export enum UserRoles {
  ADMIN = 'admin',
  SUB_ADMIN = 'subAdmin',
  USER = 'user',
}

export enum UserStatus {
  ACTIVE = 'active', // Active user
  DELETED = 'deleted', // Deleted user itself
  BLOCKED = 'blocked', // Blocked by admin
}
export enum VisitorPermissions {
  READ_VISITOR_CONTENT = 'READ_VISITOR_CONTENT',
}

export enum AdminPermissions {
  MANAGE_USERS = 'MANAGE_USERS',
  CREATE_ROLE = 'CREATE_ROLE',
  CREATE_USER = 'CREATE_USER',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',
  BLOCK_USER = 'BLOCK_USER',
  GET_ALL_USERS = 'GET_ALL_USERS',
  UPDATE_ROLE = 'UPDATE_ROLE',
  DELETE_ROLE = 'DELETE_ROLE',
  GET_ROLE = 'GET_ROLE',
  USERS = 'user',
  ROLE = 'role',
  PERMISSION = 'permission',
  SUBSCRIPTION = 'subscription',
  PLAN = 'plan',
  ME = 'me',
  FEATURE = 'feature',
  CREATE_PERMISSION = 'CREATE_PERMISSION',
  READ_ALL_PERMISSIONS = 'READ_ALL_PERMISSIONS',
  READ_PERMISSION = 'READ_PERMISSION',
  UPDATE_PERMISSION = 'UPDATE_PERMISSION',
  DELETE_PERMISSION = 'DELETE_PERMISSION',
  READ_ALL_ROLES = 'READ_ALL_ROLES',
  READ_ROLE = 'READ_ROLE',
  ASSIGN_NEW_PERMISSION_ROLE = 'ASSIGN_NEW_PERMISSION_ROLE',
  CHANGE_USER_ROLE = 'CHANGE_USER_ROLE',
}
export enum MemeberStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}
export enum WorkSpaceRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}
export enum SubAdminPermissions {
  MANAGE_SUB_ADMINS = 'MANAGE_SUB_ADMINS',
}

export enum UserPermissions {
  MANAGE_WORKSPACES = 'MANAGE_WORKSPACES',
}

export enum SOCIAL_MEDIA_PLATFORMS {
  Facebook = 'Facebook',
  Instagram = 'Instagram',
  Pinterest = 'Pinterest',
  X = 'X', // Twitter
  TikTok = 'TikTok',
  YouTube = 'YouTube',
  Threads = 'Threads',
  BlueSky = 'BlueSky',
}
