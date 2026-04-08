import { createMiddleware } from 'hono/factory';
import { eq, and } from 'drizzle-orm';
import { tenants } from '../db/schema.js';
import type { DrizzleDB } from '../db/client.js';
import type { TenantEnv } from '../lib/types.js';

export function tenantMiddleware(db: DrizzleDB) {
  return createMiddleware<TenantEnv>(async (c, next) => {
    const tenantSlug = c.req.param('tenantSlug');

    if (!tenantSlug) {
      return c.json({ error: 'Tenant slug is required' }, 400);
    }

    const tenant = db
      .select()
      .from(tenants)
      .where(and(eq(tenants.slug, tenantSlug), eq(tenants.isActive, 1)))
      .get();

    if (!tenant) {
      return c.json({ error: 'Tenant not found' }, 404);
    }

    c.set('tenant', tenant);
    c.set('tenantId', tenant.id);

    await next();
  });
}
