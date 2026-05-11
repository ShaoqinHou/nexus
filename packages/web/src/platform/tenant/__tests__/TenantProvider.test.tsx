import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { useUpdateTenantSettings } from '@web/apps/ordering/hooks/useTenantSettings';
import {
  TenantProvider,
  useTenant,
  type Tenant,
  type TenantSettings,
} from '@web/platform/tenant/TenantProvider';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TenantProvider tenantSlug="demo">{children}</TenantProvider>
    </QueryClientProvider>
  );
}

function TenantSettingsReader() {
  const { tenant } = useTenant();
  const mutation = useUpdateTenantSettings('demo');
  return (
    <div>
      <div data-testid="tenant-slug">{tenant?.slug ?? 'loading'}</div>
      <div data-testid="tenant-accent">{tenant?.settings.accentColor ?? 'none'}</div>
      <button
        type="button"
        onClick={() => mutation.mutate({ accentColor: '#c89a3c' })}
      >
        Save accent
      </button>
    </div>
  );
}

describe('TenantProvider settings refresh', () => {
  it('updates tenant-scoped settings consumers after a settings save without reload', async () => {
    let settings: TenantSettings = {
      theme: 'sichuan',
      brandColor: '#b8262b',
    };
    const tenant = (): Tenant => ({
      name: 'Demo Tenant',
      slug: 'demo',
      settings,
    });

    server.use(
      http.get('/api/platform/tenants/:tenantSlug', () => (
        HttpResponse.json(tenant())
      )),
      http.put('/api/t/:tenantSlug/settings', async ({ request }) => {
        const updates = await request.json() as Partial<TenantSettings>;
        settings = { ...settings, ...updates };
        return HttpResponse.json({ data: settings });
      }),
    );

    render(<TenantSettingsReader />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByTestId('tenant-slug')).toHaveTextContent('demo'));
    expect(screen.getByTestId('tenant-accent')).toHaveTextContent('none');

    fireEvent.click(screen.getByRole('button', { name: 'Save accent' }));

    await waitFor(() => expect(screen.getByTestId('tenant-accent')).toHaveTextContent('#c89a3c'));
  });
});
