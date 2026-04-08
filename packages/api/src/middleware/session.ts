import { createMiddleware } from 'hono/factory';
import { eq, and } from 'drizzle-orm';
import { getCookie } from 'hono/cookie';
import { customerSessions } from '../db/schema.js';
import type { DrizzleDB } from '../db/client.js';
import type { CustomerEnv } from '../lib/types.js';

export function sessionMiddleware(db: DrizzleDB) {
  return createMiddleware<CustomerEnv>(async (c, next) => {
    const sessionToken = getCookie(c, 'session_token');

    if (!sessionToken) {
      return c.json({ error: 'Session required' }, 401);
    }

    const tenantId = c.var.tenantId;

    const session = db
      .select()
      .from(customerSessions)
      .where(
        and(
          eq(customerSessions.sessionToken, sessionToken),
          eq(customerSessions.tenantId, tenantId)
        )
      )
      .get();

    if (!session) {
      return c.json({ error: 'Invalid session' }, 401);
    }

    // Check if session has expired
    if (new Date(session.expiresAt) < new Date()) {
      return c.json({ error: 'Session expired' }, 401);
    }

    c.set('session', session);

    await next();
  });
}
