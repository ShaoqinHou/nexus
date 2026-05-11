import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LocaleContext } from '@web/lib/i18n';
import { generatePalette } from '@web/lib/theme';
import { ThemeProvider, useTheme } from '@web/platform/theme/ThemeProvider';
import { ThemeSettings } from '../ThemeSettings';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  toast: vi.fn(),
  settings: {
    brandColor: '#2563eb',
    accentColor: '',
    theme: 'classic',
    logoUrl: '',
    coverImageUrl: '',
    primaryLocale: 'en',
    supportedLocales: ['en'],
  },
}));

vi.mock('@web/platform/tenant/TenantProvider', () => ({
  useTenant: () => ({
    tenantSlug: 'demo',
    tenant: { id: 'tenant-1', name: 'Demo', slug: 'demo', settings: mocks.settings },
    loading: false,
    error: null,
  }),
}));

vi.mock('@web/platform/ToastProvider', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@web/apps/ordering/hooks/useTenantSettings', () => ({
  useTenantSettings: () => ({ data: mocks.settings, isLoading: false }),
  useUpdateTenantSettings: () => ({ mutate: mocks.mutate, isPending: false }),
}));

function ActiveTheme() {
  const { themeId } = useTheme();
  return <div data-testid="active-theme">{themeId}</div>;
}

function themedScope(container: HTMLElement) {
  const scope = container.querySelector<HTMLElement>('[data-themed-scope="merchant"]');
  expect(scope).not.toBeNull();
  return scope!;
}

function Harness() {
  const [showSettings, setShowSettings] = useState(true);
  return (
    <LocaleContext.Provider value={{ locale: 'en', setLocale: vi.fn(), t: (key) => key }}>
      <ThemeProvider
        initialThemeId="classic"
        scope="merchant"
        brandColor={mocks.settings.brandColor}
        accentColor={mocks.settings.accentColor || null}
      >
        <ActiveTheme />
        {showSettings ? <ThemeSettings /> : null}
        <button type="button" onClick={() => setShowSettings(false)}>
          Leave settings
        </button>
      </ThemeProvider>
    </LocaleContext.Provider>
  );
}

describe('ThemeSettings live preview', () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.toast.mockReset();
    mocks.settings.brandColor = '#2563eb';
    mocks.settings.accentColor = '';
    mocks.settings.theme = 'classic';
  });

  it('restores the saved cuisine theme when an unsaved live preview unmounts', async () => {
    render(<Harness />);

    expect(await screen.findByTestId('active-theme')).toHaveTextContent('classic');

    fireEvent.click(screen.getByRole('button', { name: /Sichuan/ }));

    await waitFor(() => {
      expect(screen.getByTestId('active-theme')).toHaveTextContent('sichuan');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Leave settings' }));

    await waitFor(() => {
      expect(screen.getByTestId('active-theme')).toHaveTextContent('classic');
    });
  });

  it('live-previews brand and accent overrides, then restores unsaved values on leave', async () => {
    const { container } = render(<Harness />);
    const scope = themedScope(container);

    expect(scope.style.getPropertyValue('--color-brand')).toBe('#2563eb');
    expect(document.body.style.getPropertyValue('--color-brand')).toBe('#2563eb');
    expect(scope.style.getPropertyValue('--color-accent')).toBe('');

    fireEvent.change(screen.getByLabelText('Brand Color'), { target: { value: '#b8262b' } });
    fireEvent.change(screen.getByLabelText('Accent Color'), { target: { value: '#c89a3c' } });

    await waitFor(() => {
      expect(scope.style.getPropertyValue('--color-brand')).toBe('#b8262b');
      expect(document.body.style.getPropertyValue('--color-brand')).toBe('#b8262b');
      expect(scope.style.getPropertyValue('--color-accent')).toBe('#c89a3c');
      expect(document.body.style.getPropertyValue('--color-accent')).toBe('#c89a3c');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Leave settings' }));

    await waitFor(() => {
      expect(scope.style.getPropertyValue('--color-brand')).toBe('#2563eb');
      expect(document.body.style.getPropertyValue('--color-brand')).toBe('#2563eb');
      expect(scope.style.getPropertyValue('--color-accent')).toBe('');
      expect(document.body.style.getPropertyValue('--color-accent')).toBe('');
    });
  });

  it('restores absent saved brand and accent overrides instead of form fallbacks', async () => {
    mocks.settings.brandColor = undefined as unknown as string;
    mocks.settings.accentColor = '';

    const { container } = render(<Harness />);
    const scope = themedScope(container);

    await waitFor(() => {
      expect(scope.style.getPropertyValue('--color-brand')).toBe('');
      expect(document.body.style.getPropertyValue('--color-brand')).toBe('');
    });

    fireEvent.change(screen.getByLabelText('Brand Color'), { target: { value: '#b8262b' } });
    fireEvent.change(screen.getByLabelText('Accent Color'), { target: { value: '#c89a3c' } });

    await waitFor(() => {
      expect(scope.style.getPropertyValue('--color-brand')).toBe('#b8262b');
      expect(scope.style.getPropertyValue('--color-accent')).toBe('#c89a3c');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Leave settings' }));

    await waitFor(() => {
      expect(scope.style.getPropertyValue('--color-brand')).toBe('');
      expect(document.body.style.getPropertyValue('--color-brand')).toBe('');
      expect(scope.style.getPropertyValue('--color-accent')).toBe('');
      expect(document.body.style.getPropertyValue('--color-accent')).toBe('');
    });
  });

  it('keeps saved live-preview theme, brand, and accent after leaving settings', async () => {
    mocks.mutate.mockImplementation((settings, options) => {
      options?.onSuccess?.({ data: settings });
    });

    const { container } = render(<Harness />);
    const scope = themedScope(container);

    fireEvent.click(screen.getByRole('button', { name: /Sichuan/ }));
    fireEvent.change(screen.getByLabelText('Brand Color'), { target: { value: '#b8262b' } });
    fireEvent.change(screen.getByLabelText('Accent Color'), { target: { value: '#d7a629' } });
    await waitFor(() => {
      expect(screen.getByTestId('active-theme')).toHaveTextContent('sichuan');
      expect(scope.style.getPropertyValue('--color-brand')).toBe('#b8262b');
      expect(scope.style.getPropertyValue('--color-accent')).toBe('#d7a629');
    });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));
    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: 'sichuan',
        brandColor: '#b8262b',
        accentColor: '#d7a629',
      }),
      expect.anything(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Leave settings' }));

    await waitFor(() => {
      expect(screen.getByTestId('active-theme')).toHaveTextContent('sichuan');
      expect(scope.style.getPropertyValue('--color-brand')).toBe('#b8262b');
      expect(scope.style.getPropertyValue('--color-primary')).toBe(generatePalette('#b8262b', false).primary);
      expect(scope.style.getPropertyValue('--color-accent')).toBe('#d7a629');
      expect(document.body.style.getPropertyValue('--color-accent')).toBe('#d7a629');
    });
  });
});
