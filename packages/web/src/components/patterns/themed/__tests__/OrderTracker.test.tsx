import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderTracker } from '@web/components/patterns/themed/OrderTracker';

describe('OrderTracker', () => {
  it('dine-in with status "preparing" shows the Preparing label exactly once', () => {
    render(<OrderTracker type="dine-in" status="preparing" orderNumber="1001" />);
    // S-CONCRETE-ASSERTIONS: getAllByText already throws on empty; toHaveLength
    // catches both missing AND duplicate renders that toBeGreaterThan(0) would mask.
    expect(screen.getAllByText('Preparing')).toHaveLength(1);
  });

  it('delivery with status "on-way" shows the On the way label exactly once', () => {
    render(<OrderTracker type="delivery" status="on-way" orderNumber="1002" />);
    expect(screen.getAllByText('On the way')).toHaveLength(1);
  });

  // Responsive layout — jsdom does not fire media queries, so we only verify
  // the component renders without crashing and exposes the correct step labels.
  // Visual regression for the column layout is covered by E2E / Zoo screenshot.
  it('renders dine-in tracker without crashing (wide layout)', () => {
    const { container } = render(
      <OrderTracker type="dine-in" status="received" orderNumber="1003" />,
    );
    expect(container.firstChild).not.toBeNull();
    expect(screen.getAllByText('Received')).toHaveLength(1);
  });

  it('renders delivery tracker without crashing (wide layout)', () => {
    const { container } = render(
      <OrderTracker type="delivery" status="delivered" orderNumber="1004" />,
    );
    expect(container.firstChild).not.toBeNull();
    expect(screen.getAllByText('Delivered')).toHaveLength(1);
  });

  it('renders all four step labels for dine-in', () => {
    render(<OrderTracker type="dine-in" status="served" orderNumber="1005" />);
    expect(screen.getByText('Received')).toBeDefined();
    expect(screen.getByText('Preparing')).toBeDefined();
    expect(screen.getByText('Ready')).toBeDefined();
    expect(screen.getByText('Served')).toBeDefined();
  });

  it('renders all four step labels for delivery', () => {
    render(<OrderTracker type="delivery" status="delivered" orderNumber="1006" />);
    expect(screen.getByText('Received')).toBeDefined();
    expect(screen.getByText('Preparing')).toBeDefined();
    expect(screen.getByText('On the way')).toBeDefined();
    expect(screen.getByText('Delivered')).toBeDefined();
  });
});
