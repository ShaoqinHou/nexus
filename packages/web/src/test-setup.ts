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
