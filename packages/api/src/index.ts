import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { db } from './db/client.js';
import { platformRoutes } from './routes/platform.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { staffOrderingRoutes, customerOrderingRoutes } from './modules/ordering/routes.js';
import { tenantSettingsRoutes } from './routes/tenant-settings.js';
import { uploadRoutes, uploadServeRoutes } from './routes/upload.js';
import type { TenantEnv } from './lib/types.js';

const app = new Hono();

// CORS
app.use('*', cors({
  origin: ['http://localhost:5173', 'https://cv.rehou.games', 'https://rehou.games'],
  credentials: true,
}));

// --- Platform Routes (no tenant middleware) ---
app.route('/api/platform', platformRoutes(db));

// --- Tenant-Scoped Routes (staff-facing) ---
const tenantApp = new Hono<TenantEnv>();
tenantApp.use('*', tenantMiddleware(db));

tenantApp.route('/ordering', staffOrderingRoutes(db));
tenantApp.route('/settings', tenantSettingsRoutes(db));
tenantApp.route('/upload', uploadRoutes(db));

app.route('/api/t/:tenantSlug', tenantApp);

// --- Static File Serving (public, no auth) ---
app.route('/api/uploads', uploadServeRoutes());

// --- Customer-Facing Routes ---
const customerApp = new Hono<TenantEnv>();
customerApp.use('*', tenantMiddleware(db));

customerApp.route('/ordering', customerOrderingRoutes(db));

app.route('/api/order/:tenantSlug', customerApp);

// --- Start Server ---
const PORT = Number(process.env.PORT) || 3001;

serve({
  fetch: app.fetch,
  port: PORT,
}, (info) => {
  console.log(`Nexus API running on http://localhost:${info.port}`);
});

export { app };
