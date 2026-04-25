import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PromoCard } from '@web/components/patterns/themed/PromoCard';

// ---------------------------------------------------------------------------
// Clipboard mock
// ---------------------------------------------------------------------------

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  });
  writeText.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Helpers — simulate pointer events
// jsdom's PointerEvent constructor accepts clientX/clientY only when dispatched
// via the native constructor. Use createEvent+initMouseEvent for reliable coords.
// ---------------------------------------------------------------------------

function pointerDown(el: Element, x = 0, y = 0) {
  const ev = new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  });
  el.dispatchEvent(ev);
}

function pointerUp(el: Element, x = 0, y = 0) {
  const ev = new PointerEvent('pointerup', {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  });
  el.dispatchEvent(ev);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PromoCard', () => {
  it('renders title, discount, and code', () => {
    render(
      <PromoCard
        title="Happy Hour"
        discount="25% OFF"
        code="HAPPY25"
        description="Weekdays 3-6pm · all appetisers"
      />,
    );

    expect(screen.getByText('Happy Hour')).toBeInTheDocument();
    expect(screen.getByText('25% OFF')).toBeInTheDocument();
    // The code chip renders "Code HAPPY25"
    expect(screen.getByText(/HAPPY25/)).toBeInTheDocument();
  });

  it('does not render a code chip when code is absent', () => {
    render(<PromoCard title="Happy Hour" discount="25% OFF" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  describe('tap-to-copy (tap-not-scroll heuristic)', () => {
    it('copies code on a fast, stationary tap and calls onCopy', async () => {
      const onCopy = vi.fn();
      render(<PromoCard code="HAPPY25" onCopy={onCopy} />);
      const btn = screen.getByRole('button');

      // Simulate pointer down then up immediately with no movement
      pointerDown(btn, 10, 10);
      pointerUp(btn, 10, 10); // same coords, instant → tap

      // Wait for the clipboard promise to resolve
      await act(async () => {
        await Promise.resolve();
      });

      expect(writeText).toHaveBeenCalledWith('HAPPY25');
      expect(onCopy).toHaveBeenCalledWith('HAPPY25');
    });

    it('does NOT copy when pointer moves more than 10px (scroll/drag)', async () => {
      const onCopy = vi.fn();
      render(<PromoCard code="HAPPY25" onCopy={onCopy} />);
      const btn = screen.getByRole('button');

      pointerDown(btn, 0, 0);
      pointerUp(btn, 50, 0); // Δx = 50, distSq = 2500 ≥ 100

      await act(async () => {
        await Promise.resolve();
      });

      expect(writeText).not.toHaveBeenCalled();
      expect(onCopy).not.toHaveBeenCalled();
    });

    it('does NOT copy when pointer hold exceeds 250ms', async () => {
      const onCopy = vi.fn();
      render(<PromoCard code="HAPPY25" onCopy={onCopy} />);
      const btn = screen.getByRole('button');

      pointerDown(btn, 0, 0);
      // Advance fake timers to simulate a long press (300ms)
      act(() => {
        vi.advanceTimersByTime(300);
      });
      pointerUp(btn, 0, 0);

      await act(async () => {
        await Promise.resolve();
      });

      expect(writeText).not.toHaveBeenCalled();
      expect(onCopy).not.toHaveBeenCalled();
    });

    it('shows "Copied!" feedback state after a successful tap', async () => {
      render(<PromoCard code="HAPPY25" />);
      const btn = screen.getByRole('button');

      pointerDown(btn, 0, 0);
      pointerUp(btn, 0, 0);

      await act(async () => {
        await Promise.resolve();
      });

      // Chip should now show "Copied!" text
      expect(screen.getByText(/Copied!/)).toBeInTheDocument();

      // After 500ms the chip reverts
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(screen.queryByText(/Copied!/)).toBeNull();
      expect(screen.getByText(/HAPPY25/)).toBeInTheDocument();
    });

    it('copies on Enter key press for keyboard accessibility', async () => {
      const onCopy = vi.fn();
      render(<PromoCard code="HAPPY25" onCopy={onCopy} />);
      const btn = screen.getByRole('button');

      fireEvent.keyDown(btn, { key: 'Enter' });

      await act(async () => {
        await Promise.resolve();
      });

      expect(writeText).toHaveBeenCalledWith('HAPPY25');
      expect(onCopy).toHaveBeenCalledWith('HAPPY25');
    });

    it('copies on Space key press for keyboard accessibility', async () => {
      const onCopy = vi.fn();
      render(<PromoCard code="HAPPY25" onCopy={onCopy} />);
      const btn = screen.getByRole('button');

      fireEvent.keyDown(btn, { key: ' ' });

      await act(async () => {
        await Promise.resolve();
      });

      expect(writeText).toHaveBeenCalledWith('HAPPY25');
      expect(onCopy).toHaveBeenCalledWith('HAPPY25');
    });
  });
});
