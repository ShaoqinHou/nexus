import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastContainer } from '@web/components/ui';

describe('Toast', () => {
  it('renders info toast with info semantic styling', () => {
    render(
      <ToastContainer
        toasts={[{ id: 'info-1', type: 'info', message: 'Kitchen display connected.' }]}
        onDismiss={() => {}}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-info-light');
    expect(alert).toHaveClass('text-info');
    expect(alert).toHaveClass('border-info/20');
  });

  it('renders warning toast with warning styling and allows dismiss', () => {
    const onDismiss = vi.fn();

    render(
      <ToastContainer
        toasts={[{ id: 'warning-1', type: 'warning', message: 'Low stock warning.' }]}
        onDismiss={onDismiss}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('Low stock warning.')).toBeInTheDocument();

    // Warning icon is present via Lucide component.
    expect(alert.querySelector('svg')).toBeInTheDocument();
    expect(alert).toHaveClass('bg-warning-light');
    expect(alert).toHaveClass('text-warning');
    expect(alert).toHaveClass('border-warning/20');

    const dismissButton = screen.getByRole('button', { name: /Dismiss notification/i });
    expect(dismissButton).toBeInTheDocument();
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith('warning-1');
  });
});
