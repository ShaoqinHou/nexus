import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../../middleware/auth.js';
import type { DrizzleDB } from '../../db/client.js';
import type { AuthEnv } from '../../lib/types.js';
import { updateTenantSettingsSchema } from './schema.js';
import {
  canUpdateTenantSettings,
  parseTenantSettings,
  updateTenantSettings,
} from './service.js';

export function tenantSettingsRoutes(db: DrizzleDB) {
  const router = new Hono<AuthEnv>();

  // All settings routes require authentication (owner/manager)
  router.use('*', authMiddleware(db));

  // GET /settings - return current tenant settings
  router.get('/', (c) => {
    const tenant = c.var.tenant;
    return c.json({ data: parseTenantSettings(tenant.settings) });
  });

  // PUT /settings - merge partial settings with existing
  router.put('/', zValidator('json', updateTenantSettingsSchema), (c) => {
    const user = c.var.user;

    if (!canUpdateTenantSettings(user.role)) {
      return c.json({ error: 'Only owners and managers can update settings' }, 403);
    }

    const tenant = c.var.tenant;
    const resultSettings = updateTenantSettings(
      db,
      tenant.id,
      tenant.settings,
      c.req.valid('json'),
    );

    return c.json({ data: resultSettings });
  });

  return router;
}
