import type { Tenant, Staff, CustomerSession } from '../db/schema.js';

export interface TenantEnv {
  Variables: {
    tenant: Tenant;
    tenantId: string;
  };
}

export interface AuthEnv {
  Variables: {
    tenant: Tenant;
    tenantId: string;
    user: Staff;
  };
}

export interface CustomerEnv {
  Variables: {
    tenant: Tenant;
    tenantId: string;
    session: CustomerSession;
  };
}
