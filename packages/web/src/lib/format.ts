let currencySymbol = '$';

/** Set the currency symbol used by formatPrice/formatPriceDelta. */
export function setCurrencySymbol(symbol: string): void {
  currencySymbol = symbol;
}

/** Map a currency code (e.g. "NZD", "EUR") to a display symbol. */
export function currencyCodeToSymbol(code: string | undefined): string {
  switch (code) {
    case 'NZD': return 'NZ$';
    case 'AUD': return 'A$';
    case 'EUR': return '\u20ac';
    case 'GBP': return '\u00a3';
    case 'JPY': return '\u00a5';
    case 'CNY': return '\u00a5';
    case 'USD':
    default:
      return '$';
  }
}

/** Format price as $X.XX (symbol set via setCurrencySymbol) */
export function formatPrice(price: number): string {
  return `${currencySymbol}${price.toFixed(2)}`;
}

/** Format price modifier as +$X.XX or -$X.XX */
export function formatPriceDelta(delta: number): string {
  if (delta === 0) return '';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${currencySymbol}${delta.toFixed(2)}`;
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
