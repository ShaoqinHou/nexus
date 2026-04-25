import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CheckoutSummary } from '@web/components/patterns/themed/CheckoutSummary';

const ITEMS = [
  { name: 'Kung Pao Chicken', quantity: 1, unitPrice: 16.0 },
  { name: 'Fried Rice', quantity: 2, unitPrice: 8.0 },
  { name: 'Spring Rolls', quantity: 1, unitPrice: 7.5 },
];

// total = 16 + 16 + 7.5 = 39.50

describe('CheckoutSummary', () => {
  it('CTA button label contains the computed total', () => {
    render(<CheckoutSummary items={ITEMS} onPlaceOrder={() => {}} />);

    // Default label: "Place order · $39.50"
    const button = screen.getByRole('button');
    expect(button.textContent).toContain('39.50');
  });

  it('clicking the CTA calls onPlaceOrder', () => {
    const handler = vi.fn();
    render(<CheckoutSummary items={ITEMS} onPlaceOrder={handler} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
