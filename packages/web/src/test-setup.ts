import '@testing-library/jest-dom';

// jsdom does not ship with PointerEvent; polyfill it so pointer-event tests work.
if (typeof window.PointerEvent === 'undefined') {
  class PointerEvent extends MouseEvent {
    pointerId: number;
    pointerType: string;
    isPrimary: boolean;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
      this.pointerType = params.pointerType ?? 'mouse';
      this.isPrimary = params.isPrimary ?? true;
    }
  }
  // @ts-expect-error — polyfill for jsdom test environment
  window.PointerEvent = PointerEvent;
}

// jsdom does not implement matchMedia; ThemeProvider uses it for the initial
// light/dark mode, so keep the browser stub in shared setup instead of each
// ThemeProvider-adjacent test file.
if (typeof window.matchMedia === 'undefined') {
  const noop = () => {};
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: noop,
      removeListener: noop,
      addEventListener: noop,
      removeEventListener: noop,
      dispatchEvent: () => false,
    }),
  });
}
