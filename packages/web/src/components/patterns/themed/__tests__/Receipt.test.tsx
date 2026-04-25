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

  it('renders a discount row when discountAmount is provided', () => {
    render(
      <Receipt
        restaurantName="Test Restaurant"
        orderNumber="2000"
        items={ITEMS}
        discountAmount={5}
        discountLabel="Promo Code"
      />,
    );

    expect(screen.getByText('Promo Code')).toBeInTheDocument();
    // Discount value should appear as -$5.00
    expect(screen.getByText('-$5.00')).toBeInTheDocument();
  });

  it('renders default Discount label when discountLabel is omitted', () => {
    render(
      <Receipt
        restaurantName="Test Restaurant"
        orderNumber="2001"
        items={ITEMS}
        discountAmount={3}
      />,
    );

    expect(screen.getByText('Discount')).toBeInTheDocument();
  });

  it('renders tax as a footnote when taxInclusive is true', () => {
    render(
      <Receipt
        restaurantName="Test Restaurant"
        orderNumber="2002"
        items={ITEMS}
        taxRate={0.15}
        taxInclusive
        taxLabel="GST"
      />,
    );

    // Tax-inclusive footnote should be visible, not a separate row above Total
    const footnote = screen.getByText(/includes.*15%.*GST/i);
    expect(footnote).toBeInTheDocument();

    // There should NOT be a separate "GST" row before the Total line
    // (only the footnote references GST)
    const allGstRefs = screen.getAllByText(/GST/i);
    // All occurrences should be inside the footnote text, not a standalone row label
    allGstRefs.forEach((el) => {
      expect(el.textContent).toMatch(/includes/i);
    });
  });

  it('does not render tax footnote when taxInclusive is false', () => {
    render(
      <Receipt
        restaurantName="Test Restaurant"
        orderNumber="2003"
        items={ITEMS}
        taxRate={0.1}
        taxInclusive={false}
        taxLabel="Tax"
      />,
    );

    // Should not have an "includes" footnote
    expect(screen.queryByText(/includes/i)).not.toBeInTheDocument();
    // Should have a standalone Tax row
    expect(screen.getByText(/Tax \(10%\)/)).toBeInTheDocument();
  });

  it('uses itemRenderer when provided instead of default mono-line', () => {
    const renderCalls: number[] = [];
    render(
      <Receipt
        restaurantName="Test Restaurant"
        orderNumber="2004"
        items={ITEMS}
        itemRenderer={(_item, idx) => {
          renderCalls.push(idx);
          return <div key={idx} data-testid={`custom-item-${idx}`}>custom-{idx}</div>;
        }}
      />,
    );

    // itemRenderer called once per item
    expect(renderCalls).toEqual([0, 1, 2]);
    // Custom elements rendered instead of default
    expect(screen.getByTestId('custom-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('custom-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('custom-item-2')).toBeInTheDocument();
    // Default item names should not appear as standalone text (only inside custom renderer)
    // The custom renderer renders "custom-0" etc, NOT the item names
    expect(screen.queryByText('Mapo Tofu')).not.toBeInTheDocument();
  });

  it('renders prices using formatPrice (currency symbol, not hardcoded $)', () => {
    render(
      <Receipt
        restaurantName="Test"
        orderNumber="2005"
        items={[{ name: 'Item A', quantity: 1, unitPrice: 10 }]}
        taxRate={0}
      />,
    );

    // formatPrice uses the module-level currency symbol (defaults to '$').
    // $10.00 appears exactly twice: once for the line item, once for the Total
    // (no tax row when taxRate=0). toHaveLength catches both missing AND extra
    // renders, where toBeGreaterThanOrEqual(1) would silently pass on either.
    expect(screen.getAllByText('$10.00')).toHaveLength(2);
  });

  it('uses custom taxLabel in the tax row', () => {
    render(
      <Receipt
        restaurantName="Test"
        orderNumber="2006"
        items={ITEMS}
        taxRate={0.1}
        taxLabel="VAT"
      />,
    );

    expect(screen.getByText(/VAT \(10%\)/)).toBeInTheDocument();
  });
});
