import type { Permission } from "./permissions";

export interface ApiKey {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  keyPrefix: string;
  permissions: Permission[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface ApiKeyWithSecret extends ApiKey {
  secret: string;
}

export interface CreateApiKeyInput {
  name: string;
  permissions: Permission[];
  expiresAt?: Date;
}

export interface UpdateApiKeyInput {
  name?: string;
  permissions?: Permission[];
}

export interface ApiKeyListResult {
  keys: ApiKey[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiKeyContext {
  tenantId: string;
  userId: string;
  apiKeyId: string;
  permissions: Permission[];
}
