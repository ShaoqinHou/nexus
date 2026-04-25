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
});
