import type { Permission } from "./permissions";

/**
 * Tenant represents an organization using the system
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  settings: TenantSettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSettings {
  /** Default label format for new templates */
  defaultLabelFormat: string;
  /** Timezone for the tenant */
  timezone: string;
  /** Date format preference */
  dateFormat: string;
  /** Custom branding */
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
  };
}

export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  defaultLabelFormat: "avery-5160",
  timezone: "UTC",
  dateFormat: "YYYY-MM-DD",
};

/**
 * Context resolved for every authenticated request
 * This is the primary security primitive
 */
export interface TenantContext {
  tenantId: string;
  userId: string;
  permissions: Permission[];
  sessionId: string;
}

/**
 * Request with tenant context attached
 */
export interface AuthenticatedRequest extends Request {
  ctx: TenantContext;
}

/**
 * Tenant creation input
 */
export interface CreateTenantInput {
  name: string;
  slug: string;
  domain?: string;
  settings?: Partial<TenantSettings>;
}

/**
 * Tenant update input
 */
export interface UpdateTenantInput {
  name?: string;
  domain?: string;
  settings?: Partial<TenantSettings>;
  isActive?: boolean;
}
