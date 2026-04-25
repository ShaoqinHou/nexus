import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─── helpers ────────────────────────────────────────────────────────────────

function setPathname(pathname: string) {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, pathname, href: `http://localhost${pathname}` },
    writable: true,
    configurable: true,
  });
}

// ─── 401 global-logout guard ────────────────────────────────────────────────

describe('apiClient 401 logout guard', () => {
  const FAKE_TOKEN = 'fake-staff-jwt';
  const ORIGINAL_HREF = window.location.href;

  beforeEach(() => {
    // Plant a staff token so getAuthToken() returns truthy
    localStorage.setItem('nexus_token', FAKE_TOKEN);
    localStorage.setItem('nexus_user', JSON.stringify({ id: 'u1', name: 'Staff' }));

    // Reset href tracker
    Object.defineProperty(window, 'location', {
      value: { pathname: '/', href: 'http://localhost/' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    vi.restoreAllMocks();

    // Restore original location
    Object.defineProperty(window, 'location', {
      value: { ...window.location, href: ORIGINAL_HREF },
      writable: true,
      configurable: true,
    });
  });

  it('does NOT redirect to /login when the current path is a customer QR route', async () => {
    // Arrange: simulate a customer tab at /order/demo?table=3
    setPathname('/order/demo');

    // Mock fetch to return a 401 (cookie session expired, for example)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    // Dynamically import apiClient AFTER setting up stubs so import.meta.env is resolved
    const { apiClient } = await import('@web/lib/api');

    // Act: fire a request (it will throw ApiClientError, which we catch)
    try {
      await apiClient.get('/order/t/demo/menu');
    } catch {
      // Expected — we only care about the side-effect, not the thrown error
    }

    // Assert: location was NOT redirected to /login
    expect(window.location.href).not.toBe('/login');
    // Staff token must still be in localStorage (not cleared)
    expect(localStorage.getItem('nexus_token')).toBe(FAKE_TOKEN);
  });

  it('DOES redirect to /login on 401 when on a non-customer route', async () => {
    // Arrange: simulate a staff tab at /nexus/tenant/demo
    setPathname('/nexus/tenant/demo');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Token expired' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const { apiClient } = await import('@web/lib/api');

    try {
      await apiClient.get('/t/demo/ordering/menu');
    } catch {
      // Expected
    }

    // Assert: location WAS set to /login
    expect(window.location.href).toBe('/login');
    // Staff token was cleared
    expect(localStorage.getItem('nexus_token')).toBeNull();
  });
});
