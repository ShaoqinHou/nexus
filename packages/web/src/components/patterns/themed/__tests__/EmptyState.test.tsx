import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Utensils } from 'lucide-react';
import { ThemedEmptyState } from '@web/components/patterns/themed/EmptyState';

describe('ThemedEmptyState', () => {
  it('uses a theme wrapper and renders the action', () => {
    const onClick = vi.fn();

    const { container } = render(
      <ThemedEmptyState
        theme="sichuan"
        icon={Utensils}
        title="No dishes yet"
        description="Create your first menu item."
        action={{ label: 'Add dish', onClick }}
      />,
    );

    expect(container.firstElementChild).toHaveAttribute('data-theme', 'sichuan');
    expect(screen.getByText('No dishes yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first menu item.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add dish' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
