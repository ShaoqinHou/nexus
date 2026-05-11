import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemedToast } from '@web/components/patterns/themed/Toast';

describe('ThemedToast', () => {
  it('uses a theme wrapper and renders title and description', () => {
    const { container } = render(
      <ThemedToast
        theme="trattoria"
        kind="warning"
        title="Low stock"
        description="Only two portions of gnocchi remain."
      />,
    );

    expect(container.firstElementChild).toHaveAttribute('data-theme', 'trattoria');
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Low stock')).toBeInTheDocument();
    expect(screen.getByText('Only two portions of gnocchi remain.')).toBeInTheDocument();
  });

  it('accepts the reference danger kind as an alias for error tone', () => {
    render(
      <ThemedToast
        theme="sichuan"
        kind="danger"
        title="Payment failed"
        description="Ask the customer to try another method."
      />,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Payment failed')).toBeInTheDocument();
  });
});
