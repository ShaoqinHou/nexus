import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { tenants } from '../db/schema.js';
import type { DrizzleDB } from '../db/client.js';
import type { AuthEnv } from '../lib/types.js';

const operatingHoursEntrySchema = z.object({
  day: z.number().int().min(0).max(6),
  open: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format'),
  close: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format'),
});

const updateSettingsSchema = z.object({
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  coverImageUrl: z.string().url().optional().or(z.literal('')),
  preset: z.string().optional().or(z.literal('')),
  fontFamily: z.string().optional(),
  borderRadius: z.enum(['sharp', 'rounded', 'pill']).optional(),
  surfaceStyle: z.enum(['flat', 'subtle', 'elevated']).optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  operatingHours: z.array(operatingHoursEntrySchema).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  taxInclusive: z.boolean().optional(),
  taxLabel: z.string().max(20).optional(),
  primaryLocale: z.string().min(2).max(5).optional(),
  supportedLocales: z.array(z.string().min(2).max(5)).optional(),
  lastOrderMinutesBefore: z.number().int().min(0).max(120).optional(),
  paymentModel: z.enum(['pre_pay', 'post_pay']).optional(),
  kitchenLocale: z.string().min(2).max(5).optional(),
});

export function tenantSettingsRoutes(db: DrizzleDB) {
  const router = new Hono<AuthEnv>();

  // All settings routes require authentication (owner/manager)
  router.use('*', authMiddleware(db));

  // GET /settings — return current tenant settings
  router.get('/', (c) => {
    const tenant = c.var.tenant;
    const settings = tenant.settings ? JSON.parse(tenant.settings) : {};
    return c.json({ data: settings });
  });

  // PUT /settings — merge partial settings with existing
  router.put('/', zValidator('json', updateSettingsSchema), (c) => {
    const user = c.var.user;

    // Only owners and managers can update settings
    if (user.role !== 'owner' && user.role !== 'manager') {
      return c.json({ error: 'Only owners and managers can update settings' }, 403);
    }

    const tenant = c.var.tenant;
    const existingSettings = tenant.settings ? JSON.parse(tenant.settings) : {};
    const updates = c.req.valid('json');

    // Merge: new values overwrite existing, empty strings remove keys
    const merged = { ...existingSettings };
    for (const [key, value] of Object.entries(updates)) {
      if (value === '' || value === undefined) {
        delete merged[key];
      } else {
        merged[key] = value;
      }
    }

    const updatedTenant = db
      .update(tenants)
      .set({
        settings: JSON.stringify(merged),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tenants.id, tenant.id))
      .returning()
      .get();

    const resultSettings = updatedTenant.settings
      ? JSON.parse(updatedTenant.settings)
      : {};

    return c.json({ data: resultSettings });
  });

  return router;
}
