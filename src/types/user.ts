import type { Role } from "./permissions";

/**
 * User in the system
 */
export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User with password hash (internal use only)
 */
export interface UserWithPassword extends User {
  passwordHash: string;
}

/**
 * Session for tracking active user sessions
 */
export interface Session {
  id: string;
  userId: string;
  tenantId: string;
  refreshTokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * JWT payload for access tokens
 */
export interface AccessTokenPayload {
  sub: string; // userId
  tid: string; // tenantId
  sid: string; // sessionId
  role: Role;
  iat: number;
  exp: number;
}

/**
 * JWT payload for refresh tokens
 */
export interface RefreshTokenPayload {
  sub: string; // userId
  sid: string; // sessionId
  iat: number;
  exp: number;
}

/**
 * User creation input
 */
export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: Role;
}

/**
 * User update input
 */
export interface UpdateUserInput {
  email?: string;
  name?: string;
  role?: Role;
  isActive?: boolean;
}

/**
 * Password change input
 */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  user: Omit<User, "tenantId">;
  accessToken: string;
  expiresIn: number;
}

/**
 * User profile (safe to return to client)
 */
export type UserProfile = Omit<User, "tenantId">;
