import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { authMiddleware } from '../middleware/auth.js';
import { staff } from '../db/schema.js';
import type { DrizzleDB } from '../db/client.js';
import type { AuthEnv } from '../lib/types.js';
import type { StaffRole } from '../db/schema.js';

const SALT_ROUNDS = 10;

// --- Validation Schemas ---

const createStaffSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['manager', 'staff'] as const),
});

const updateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['owner', 'manager', 'staff'] as const).optional(),
  isActive: z.number().int().min(0).max(1).optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// Role hierarchy for permission checks
const ROLE_LEVEL: Record<StaffRole, number> = {
  owner: 3,
  manager: 2,
  staff: 1,
};

export function staffRoutes(db: DrizzleDB) {
  const router = new Hono<AuthEnv>();

  // All staff routes require authentication
  router.use('*', authMiddleware(db));

  // GET / — list all staff for this tenant
  router.get('/', (c) => {
    const user = c.var.user;
    const tenantId = c.var.tenantId;

    // Only owners and managers can list staff
    if (user.role !== 'owner' && user.role !== 'manager') {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const staffList = db
      .select({
        id: staff.id,
        tenantId: staff.tenantId,
        email: staff.email,
        name: staff.name,
        role: staff.role,
        isActive: staff.isActive,
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
      })
      .from(staff)
      .where(eq(staff.tenantId, tenantId))
      .all();

    return c.json({ data: staffList });
  });

  // POST / — create/invite a new staff member
  router.post('/', zValidator('json', createStaffSchema), async (c) => {
    const user = c.var.user;
    const tenantId = c.var.tenantId;

    // Only owners and managers can create staff
    if (user.role !== 'owner' && user.role !== 'manager') {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const { name, email, password, role } = c.req.valid('json');

    // Managers can only create staff-level users
    if (user.role === 'manager' && role !== 'staff') {
      return c.json({ error: 'Managers can only create staff-level users' }, 403);
    }

    // Check email uniqueness within tenant
    const existing = db
      .select()
      .from(staff)
      .where(and(eq(staff.tenantId, tenantId), eq(staff.email, email)))
      .get();

    if (existing) {
      return c.json({ error: 'A staff member with this email already exists' }, 409);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const newStaff = db
      .insert(staff)
      .values({
        tenantId,
        name,
        email,
        passwordHash,
        role,
      })
      .returning({
        id: staff.id,
        tenantId: staff.tenantId,
        email: staff.email,
        name: staff.name,
        role: staff.role,
        isActive: staff.isActive,
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
      })
      .get();

    return c.json({ data: newStaff }, 201);
  });

  // PUT /:id — update a staff member
  router.put('/:id', zValidator('json', updateStaffSchema), (c) => {
    const user = c.var.user;
    const tenantId = c.var.tenantId;
    const staffId = c.req.param('id');

    // Only owners and managers can update staff
    if (user.role !== 'owner' && user.role !== 'manager') {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    // Find the target staff member
    const target = db
      .select()
      .from(staff)
      .where(and(eq(staff.id, staffId), eq(staff.tenantId, tenantId)))
      .get();

    if (!target) {
      return c.json({ error: 'Staff member not found' }, 404);
    }

    const updates = c.req.valid('json');

    // Cannot modify someone with a higher or equal role (unless you're owner)
    if (user.role !== 'owner' && ROLE_LEVEL[target.role] >= ROLE_LEVEL[user.role]) {
      return c.json({ error: 'Cannot modify a staff member with equal or higher role' }, 403);
    }

    // Cannot promote to a role higher than your own
    if (updates.role && user.role !== 'owner' && ROLE_LEVEL[updates.role] >= ROLE_LEVEL[user.role]) {
      return c.json({ error: 'Cannot assign a role equal to or higher than your own' }, 403);
    }

    // Owner role cannot be deactivated
    if (target.role === 'owner' && updates.isActive === 0) {
      return c.json({ error: 'Cannot deactivate the owner account' }, 403);
    }

    // Cannot demote yourself (own role can't be downgraded)
    if (staffId === user.id && updates.role && ROLE_LEVEL[updates.role] < ROLE_LEVEL[user.role]) {
      return c.json({ error: 'Cannot downgrade your own role' }, 403);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

    const updated = db
      .update(staff)
      .set(updateData)
      .where(and(eq(staff.id, staffId), eq(staff.tenantId, tenantId)))
      .returning({
        id: staff.id,
        tenantId: staff.tenantId,
        email: staff.email,
        name: staff.name,
        role: staff.role,
        isActive: staff.isActive,
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
      })
      .get();

    return c.json({ data: updated });
  });

  // PUT /:id/reset-password — reset a staff member's password
  router.put('/:id/reset-password', zValidator('json', resetPasswordSchema), async (c) => {
    const user = c.var.user;
    const tenantId = c.var.tenantId;
    const staffId = c.req.param('id');

    // Only owners and managers can reset passwords
    if (user.role !== 'owner' && user.role !== 'manager') {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    // Find the target staff member
    const target = db
      .select()
      .from(staff)
      .where(and(eq(staff.id, staffId), eq(staff.tenantId, tenantId)))
      .get();

    if (!target) {
      return c.json({ error: 'Staff member not found' }, 404);
    }

    // Cannot reset password of someone with a higher or equal role (unless you're owner)
    if (user.role !== 'owner' && ROLE_LEVEL[target.role] >= ROLE_LEVEL[user.role]) {
      return c.json({ error: 'Cannot reset password for a staff member with equal or higher role' }, 403);
    }

    const { newPassword } = c.req.valid('json');
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    db.update(staff)
      .set({ passwordHash, updatedAt: new Date().toISOString() })
      .where(and(eq(staff.id, staffId), eq(staff.tenantId, tenantId)))
      .run();

    return c.json({ success: true, message: 'Password reset successfully' });
  });

  // DELETE /:id — soft-delete (deactivate) a staff member
  router.delete('/:id', (c) => {
    const user = c.var.user;
    const tenantId = c.var.tenantId;
    const staffId = c.req.param('id');

    // Only owners and managers can deactivate staff
    if (user.role !== 'owner' && user.role !== 'manager') {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    // Cannot deactivate yourself
    if (staffId === user.id) {
      return c.json({ error: 'Cannot deactivate your own account' }, 403);
    }

    const target = db
      .select()
      .from(staff)
      .where(and(eq(staff.id, staffId), eq(staff.tenantId, tenantId)))
      .get();

    if (!target) {
      return c.json({ error: 'Staff member not found' }, 404);
    }

    // Cannot deactivate someone with a higher or equal role (unless you're owner)
    if (user.role !== 'owner' && ROLE_LEVEL[target.role] >= ROLE_LEVEL[user.role]) {
      return c.json({ error: 'Cannot deactivate a staff member with equal or higher role' }, 403);
    }

    // Owner role cannot be deactivated
    if (target.role === 'owner') {
      return c.json({ error: 'Cannot deactivate the owner account' }, 403);
    }

    db.update(staff)
      .set({ isActive: 0, updatedAt: new Date().toISOString() })
      .where(and(eq(staff.id, staffId), eq(staff.tenantId, tenantId)))
      .run();

    return c.json({ success: true });
  });

  return router;
}
