import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderTracker } from '@web/components/patterns/themed/OrderTracker';

describe('OrderTracker', () => {
  it('dine-in with status "preparing" shows the Preparing label', () => {
    render(<OrderTracker type="dine-in" status="preparing" orderNumber="1001" />);
    // The current step label is rendered as a heading-level string
    expect(screen.getAllByText('Preparing').length).toBeGreaterThan(0);
  });

  it('delivery with status "on-way" shows the On the way label', () => {
    render(<OrderTracker type="delivery" status="on-way" orderNumber="1002" />);
    expect(screen.getAllByText('On the way').length).toBeGreaterThan(0);
  });
});
