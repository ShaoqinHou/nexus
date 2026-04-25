import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PromoCard } from '@web/components/patterns/themed/PromoCard';

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
});
