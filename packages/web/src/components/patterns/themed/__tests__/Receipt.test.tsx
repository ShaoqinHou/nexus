import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Receipt } from '@web/components/patterns/themed/Receipt';

const ITEMS = [
  { name: 'Mapo Tofu', quantity: 1, unitPrice: 14.5 },
  { name: 'Steamed Rice', quantity: 2, unitPrice: 3.0 },
  { name: 'Jasmine Tea', quantity: 1, unitPrice: 4.0 },
];

describe('Receipt', () => {
  it('renders the order number and restaurant name', () => {
    render(
      <Receipt
        restaurantName="Sichuan House"
        orderNumber="1042"
        items={ITEMS}
        taxRate={0.0875}
        tipRate={0.18}
      />,
    );

    expect(screen.getByText('Sichuan House')).toBeInTheDocument();
    // Order number appears in the "#1042" reference text
    expect(screen.getByText(/1042/)).toBeInTheDocument();
  });

  it('renders at least one item name from the line items', () => {
    render(
      <Receipt
        restaurantName="Sichuan House"
        orderNumber="1042"
        items={ITEMS}
        taxRate={0.0875}
        tipRate={0.18}
      />,
    );

    expect(screen.getByText('Mapo Tofu')).toBeInTheDocument();
  });
});
