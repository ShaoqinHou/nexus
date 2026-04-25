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

  describe('precomputed-total bridge', () => {
    it('uses precomputedTotal in CTA label instead of locally computed total', () => {
      // Local computation would give 39.50; pass a different precomputed value
      render(
        <CheckoutSummary
          items={ITEMS}
          precomputedTotal={35.00}
          onPlaceOrder={() => {}}
        />,
      );

      const button = screen.getByRole('button');
      expect(button.textContent).toContain('35.00');
      // Local total should NOT appear in the button
      expect(button.textContent).not.toContain('39.50');
    });

    it('displays precomputedSubtotal in the subtotal row', () => {
      render(
        <CheckoutSummary
          items={ITEMS}
          precomputedTotal={35.00}
          precomputedSubtotal={40.00}
          onPlaceOrder={() => {}}
        />,
      );

      expect(screen.getByText('Subtotal')).toBeInTheDocument();
      // $40.00 should appear somewhere in the document
      const allText = document.body.textContent ?? '';
      expect(allText).toContain('40.00');
    });

    it('shows discount row when discountAmount > 0', () => {
      render(
        <CheckoutSummary
          items={ITEMS}
          precomputedTotal={34.50}
          discountAmount={5.00}
          discountLabel="Promo discount"
          onPlaceOrder={() => {}}
        />,
      );

      expect(screen.getByText('Promo discount')).toBeInTheDocument();
      const allText = document.body.textContent ?? '';
      expect(allText).toContain('5.00');
    });

    it('hides discount row when discountAmount is 0', () => {
      render(
        <CheckoutSummary
          items={ITEMS}
          precomputedTotal={39.50}
          discountAmount={0}
          discountLabel="Discount"
          onPlaceOrder={() => {}}
        />,
      );

      expect(screen.queryByText('Discount')).not.toBeInTheDocument();
    });

    it('shows custom taxLabel in the tax row', () => {
      render(
        <CheckoutSummary
          items={ITEMS}
          precomputedTotal={43.89}
          taxRate={0.15}
          taxLabel="GST (15%)"
          onPlaceOrder={() => {}}
        />,
      );

      expect(screen.getByText('GST (15%)')).toBeInTheDocument();
    });

    it('total row reflects precomputedTotal value', () => {
      render(
        <CheckoutSummary
          items={ITEMS}
          precomputedTotal={42.99}
          onPlaceOrder={() => {}}
        />,
      );

      const allText = document.body.textContent ?? '';
      expect(allText).toContain('42.99');
    });

    it('disables and shows loading text when loading=true', () => {
      render(
        <CheckoutSummary
          items={ITEMS}
          precomputedTotal={39.50}
          onPlaceOrder={() => {}}
          loading={true}
        />,
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button.textContent).toContain('Placing order');
    });
  });
});
