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

const myTenantsSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

const switchTenantSchema = z.object({
  targetSlug: z.string().min(1, 'Target tenant slug is required'),
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

  // My tenants: list all tenants a user has access to (by email + password)
  router.post('/auth/my-tenants', zValidator('json', myTenantsSchema), async (c) => {
    const { email, password } = c.req.valid('json');

    // Find all active staff records with this email across all tenants
    const staffRecords = db
      .select({
        staffId: staff.id,
        passwordHash: staff.passwordHash,
        name: staff.name,
        role: staff.role,
        tenantId: tenants.id,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
      })
      .from(staff)
      .innerJoin(tenants, eq(staff.tenantId, tenants.id))
      .where(
        and(
          eq(staff.email, email),
          eq(staff.isActive, 1),
          eq(tenants.isActive, 1)
        )
      )
      .all();

    if (staffRecords.length === 0) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Verify password against the first record (same email = same password across tenants)
    const passwordValid = await bcrypt.compare(password, staffRecords[0].passwordHash);
    if (!passwordValid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Return the list of tenants (without password hashes)
    const data = staffRecords.map((r) => ({
      id: r.tenantId,
      name: r.tenantName,
      slug: r.tenantSlug,
      role: r.role,
    }));

    return c.json({ data });
  });

  // Switch tenant: issue a new JWT for a different tenant using an existing valid JWT
  router.post('/auth/switch-tenant', zValidator('json', switchTenantSchema), async (c) => {
    const { targetSlug } = c.req.valid('json');

    // Verify the current JWT
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authorization header required' }, 401);
    }

    const token = authHeader.slice(7);

    let payload: { staffId: string; tenantId: string };
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (typeof decoded !== 'object' || decoded === null || !('staffId' in decoded) || !('tenantId' in decoded)) {
        return c.json({ error: 'Invalid token payload' }, 401);
      }
      payload = decoded as { staffId: string; tenantId: string };
    } catch {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    // Find the current staff member to get their email
    const currentStaff = db
      .select()
      .from(staff)
      .where(and(eq(staff.id, payload.staffId), eq(staff.isActive, 1)))
      .get();

    if (!currentStaff) {
      return c.json({ error: 'Staff member not found' }, 401);
    }

    // Resolve the target tenant
    const targetTenant = db
      .select()
      .from(tenants)
      .where(and(eq(tenants.slug, targetSlug), eq(tenants.isActive, 1)))
      .get();

    if (!targetTenant) {
      return c.json({ error: 'Target tenant not found' }, 404);
    }

    // Find the staff record for this email in the target tenant
    const targetStaff = db
      .select()
      .from(staff)
      .where(
        and(
          eq(staff.tenantId, targetTenant.id),
          eq(staff.email, currentStaff.email),
          eq(staff.isActive, 1)
        )
      )
      .get();

    if (!targetStaff) {
      return c.json({ error: 'You do not have access to this tenant' }, 403);
    }

    // Issue a new JWT for the target tenant
    const newToken = jwt.sign(
      { staffId: targetStaff.id, tenantId: targetTenant.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return c.json({
      token: newToken,
      user: {
        id: targetStaff.id,
        email: targetStaff.email,
        name: targetStaff.name,
        role: targetStaff.role,
      },
      tenant: {
        id: targetTenant.id,
        name: targetTenant.name,
        slug: targetTenant.slug,
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
