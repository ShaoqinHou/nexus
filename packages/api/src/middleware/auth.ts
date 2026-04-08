import { createMiddleware } from 'hono/factory';
import { eq, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { staff } from '../db/schema.js';
import type { DrizzleDB } from '../db/client.js';
import type { AuthEnv } from '../lib/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

interface JwtPayload {
  staffId: string;
  tenantId: string;
}

function isJwtPayload(payload: unknown): payload is JwtPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'staffId' in payload &&
    'tenantId' in payload &&
    typeof (payload as JwtPayload).staffId === 'string' &&
    typeof (payload as JwtPayload).tenantId === 'string'
  );
}

export function authMiddleware(db: DrizzleDB) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authorization header required' }, 401);
    }

    const token = authHeader.slice(7);

    let payload: unknown;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    if (!isJwtPayload(payload)) {
      return c.json({ error: 'Invalid token payload' }, 401);
    }

    // Verify staff belongs to the current tenant
    const tenantId = c.var.tenantId;
    if (payload.tenantId !== tenantId) {
      return c.json({ error: 'Token does not match tenant' }, 401);
    }

    const staffMember = db
      .select()
      .from(staff)
      .where(
        and(
          eq(staff.id, payload.staffId),
          eq(staff.tenantId, tenantId),
          eq(staff.isActive, 1)
        )
      )
      .get();

    if (!staffMember) {
      return c.json({ error: 'Staff member not found or inactive' }, 401);
    }

    c.set('user', staffMember);

    await next();
  });
}

export { JWT_SECRET };
