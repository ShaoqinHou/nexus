/** Format price as $X.XX */
export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

/** Format price modifier as +$X.XX or -$X.XX */
export function formatPriceDelta(delta: number): string {
  if (delta === 0) return '';
  const sign = delta > 0 ? '+' : '';
  return `${sign}$${delta.toFixed(2)}`;
}

/** Parse comma-separated tags into array */
export function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return [];
  return tags.split(',').filter(Boolean);
}

/** Format relative time (e.g., "2m ago", "1h ago") */
export function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

/** Format date for display (e.g., "Apr 8, 2026") */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
