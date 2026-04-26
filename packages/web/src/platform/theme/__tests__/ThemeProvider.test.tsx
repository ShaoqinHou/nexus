import { render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@web/platform/theme/ThemeProvider';
import type { ReactNode } from 'react';

// jsdom does not implement window.matchMedia — stub it out before any ThemeProvider renders.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Helper component so we can inspect context values inside tests.
function ThemeConsumer() {
  const { themeId } = useTheme();
  return <div data-testid="consumer" data-theme-id={themeId} />;
}

function Wrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

afterEach(() => {
  // Reset any data-theme attribute that may have been applied to <html>.
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.classList.remove('dark');
  // Reset any inline brand-color vars that may have been set on <html>.
  document.documentElement.style.removeProperty('--color-brand');
  document.documentElement.style.removeProperty('--color-primary');
  document.documentElement.style.removeProperty('--color-brand-hover');
  document.documentElement.style.removeProperty('--color-primary-hover');
  localStorage.clear();
});

describe('ThemeProvider — outer (global) mode', () => {
  it('does NOT set data-theme on <html> when no initialThemeId is given', () => {
    // No initialThemeId → outer / global provider (login + pre-tenant chrome).
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
      { wrapper: Wrapper },
    );

    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('does NOT set data-theme on <html> even when localStorage has a stored themeId', () => {
    localStorage.setItem('nexus_theme_id', 'sichuan');

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
      { wrapper: Wrapper },
    );

    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('still applies .dark class to <html> for dark mode', () => {
    localStorage.setItem('nexus_theme', 'dark');

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
      { wrapper: Wrapper },
    );

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});

describe('ThemeProvider — tenant-scoped customer mode', () => {
  it('renders a wrapper div with data-theme + scope="customer" when initialThemeId + scope provided', () => {
    const { container } = render(
      <ThemeProvider initialThemeId="sichuan" scope="customer">
        <ThemeConsumer />
      </ThemeProvider>,
      { wrapper: Wrapper },
    );

    const wrapperDiv = container.querySelector('[data-themed-scope="customer"]');
    expect(wrapperDiv).not.toBeNull();
    expect(wrapperDiv?.getAttribute('data-theme')).toBe('sichuan');
  });

  it('defaults scope to "customer" when only initialThemeId is provided', () => {
    const { container } = render(
      <ThemeProvider initialThemeId="izakaya">
        <ThemeConsumer />
      </ThemeProvider>,
      { wrapper: Wrapper },
    );

    const wrapperDiv = container.querySelector('[data-themed-scope]');
    expect(wrapperDiv?.getAttribute('data-themed-scope')).toBe('customer');
  });

  it('does NOT set data-theme on <html> when initialThemeId is provided', () => {
    render(
      <ThemeProvider initialThemeId="sichuan" scope="customer">
        <ThemeConsumer />
      </ThemeProvider>,
      { wrapper: Wrapper },
    );

    // <html> must stay clean — pre-tenant routes share the same <html>.
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('applies brand-color overrides as inline styles on the wrapper div (not <html>)', () => {
    const { container } = render(
      <ThemeProvider
        scope="customer"
        initialThemeId="sichuan"
        brandColor="#b8262b"
        brandColorHover="#8b1a1e"
      >
        <ThemeConsumer />
      </ThemeProvider>,
      { wrapper: Wrapper },
    );

    const wrapperDiv = container.querySelector<HTMLElement>('[data-themed-scope="customer"]');
    expect(wrapperDiv).not.toBeNull();

    // Brand vars are on the wrapper, not on <html>.
    const wrapperStyle = wrapperDiv!.style;
    expect(wrapperStyle.getPropertyValue('--color-brand')).toBe('#b8262b');
    expect(wrapperStyle.getPropertyValue('--color-primary')).toBe('#b8262b');
    expect(wrapperStyle.getPropertyValue('--color-brand-hover')).toBe('#8b1a1e');

    // <html> must NOT have these brand properties set via ThemeProvider.
    const htmlStyle = document.documentElement.style;
    expect(htmlStyle.getPropertyValue('--color-brand')).toBe('');
    expect(htmlStyle.getPropertyValue('--color-primary')).toBe('');
  });
});

describe('ThemeProvider — tenant-scoped merchant mode', () => {
  it('renders a wrapper div with data-theme + scope="merchant" when scope=merchant given', () => {
    const { container } = render(
      <ThemeProvider initialThemeId="cantonese" scope="merchant">
        <ThemeConsumer />
      </ThemeProvider>,
      { wrapper: Wrapper },
    );

    const wrapperDiv = container.querySelector('[data-themed-scope="merchant"]');
    expect(wrapperDiv).not.toBeNull();
    expect(wrapperDiv?.getAttribute('data-theme')).toBe('cantonese');
  });

  it('keeps merchant brand override on the wrapper div (not <html>)', () => {
    const { container } = render(
      <ThemeProvider
        scope="merchant"
        initialThemeId="cantonese"
        brandColor="#1f6b4a"
        brandColorHover="#155538"
      >
        <ThemeConsumer />
      </ThemeProvider>,
      { wrapper: Wrapper },
    );

    const wrapperDiv = container.querySelector<HTMLElement>('[data-themed-scope="merchant"]');
    expect(wrapperDiv).not.toBeNull();
    expect(wrapperDiv!.style.getPropertyValue('--color-brand')).toBe('#1f6b4a');
    expect(document.documentElement.style.getPropertyValue('--color-brand')).toBe('');
  });

  it('nests cleanly inside an outer ThemeProvider — outer stays neutral', () => {
    // Mirrors real usage: outer (global) provider in main.tsx wraps the
    // tenant-scoped nested provider for either customer OR merchant.
    const { container } = render(
      <ThemeProvider>
        <div data-testid="login-area">login content</div>
        <ThemeProvider initialThemeId="izakaya" scope="merchant">
          <ThemeConsumer />
        </ThemeProvider>
      </ThemeProvider>,
      { wrapper: Wrapper },
    );

    // <html> must NOT have data-theme from either provider.
    expect(document.documentElement.dataset.theme).toBeUndefined();

    // Nested provider wrapper carries the cuisine theme.
    const wrapperDiv = container.querySelector('[data-themed-scope="merchant"]');
    expect(wrapperDiv?.getAttribute('data-theme')).toBe('izakaya');

    // Outer (login) content is NOT inside the theme wrapper.
    const loginArea = screen.getByTestId('login-area');
    expect(loginArea.closest('[data-themed-scope]')).toBeNull();
  });
});
