import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { tenants, staff } from '../db/schema.js';
import type { DrizzleDB } from '../db/client.js';
import { JWT_SECRET } from '../middleware/auth.js';

const SALT_ROUNDS = 10;

// --- Validation Schemas ---

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
  tenantSlug: z.string().min(1, 'Tenant slug is required'),
});

// --- Route Factory ---

export function platformRoutes(db: DrizzleDB) {
  const router = new Hono();

  // Health check
  router.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Register: create tenant + owner staff
  router.post('/auth/register', zValidator('json', registerSchema), async (c) => {
    const { name, slug, email, password } = c.req.valid('json');

    // Check if slug is already taken
    const existingTenant = db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .get();

    if (existingTenant) {
      return c.json({ error: 'Tenant slug already taken' }, 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create tenant
    const newTenant = db.insert(tenants).values({ name, slug }).returning().get();

    // Create owner staff
    const owner = db
      .insert(staff)
      .values({
        tenantId: newTenant.id,
        email,
        passwordHash,
        name,
        role: 'owner',
      })
      .returning()
      .get();

    // Generate JWT
    const token = jwt.sign(
      { staffId: owner.id, tenantId: newTenant.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return c.json({
      token,
      user: {
        id: owner.id,
        email: owner.email,
        name: owner.name,
        role: owner.role,
      },
      tenant: {
        id: newTenant.id,
        name: newTenant.name,
        slug: newTenant.slug,
      },
    }, 201);
  });

  // Login: email + password + tenant slug
  router.post('/auth/login', zValidator('json', loginSchema), async (c) => {
    const { email, password, tenantSlug } = c.req.valid('json');

    // Resolve tenant from slug
    const tenant = db
      .select()
      .from(tenants)
      .where(and(eq(tenants.slug, tenantSlug), eq(tenants.isActive, 1)))
      .get();

    if (!tenant) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Find staff by email within the tenant
    const staffMember = db
      .select()
      .from(staff)
      .where(
        and(
          eq(staff.tenantId, tenant.id),
          eq(staff.email, email),
          eq(staff.isActive, 1)
        )
      )
      .get();

    if (!staffMember) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, staffMember.passwordHash);
    if (!passwordValid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Generate JWT
    const token = jwt.sign(
      { staffId: staffMember.id, tenantId: tenant.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return c.json({
      token,
      user: {
        id: staffMember.id,
        email: staffMember.email,
        name: staffMember.name,
        role: staffMember.role,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
    });
  });

  // Public tenant info
  router.get('/tenants/:slug', (c) => {
    const slug = c.req.param('slug');

    const tenant = db
      .select()
      .from(tenants)
      .where(and(eq(tenants.slug, slug), eq(tenants.isActive, 1)))
      .get();

    if (!tenant) {
      return c.json({ error: 'Tenant not found' }, 404);
    }

    return c.json({
      name: tenant.name,
      slug: tenant.slug,
      settings: tenant.settings ? JSON.parse(tenant.settings) : {},
    });
  });

  return router;
}
