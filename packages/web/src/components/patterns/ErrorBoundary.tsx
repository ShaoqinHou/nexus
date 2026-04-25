import { Component, type ReactNode } from 'react';
import { useT } from '@web/lib/i18n';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Default fallback rendered by `ErrorBoundary` when no `fallback` prop is
 * supplied. Extracted to a function component so the i18n `useT()` hook is
 * available — class components cannot call hooks directly.
 */
function DefaultErrorFallback({ error }: { error: Error | null }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="rounded-full bg-danger/10 p-4 mb-4">
        <svg className="h-8 w-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-text mb-2">{t('Something went wrong')}</h2>
      <p className="text-sm text-text-secondary max-w-xs mb-4">
        {error?.message || t('An unexpected error occurred.')}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="px-4 py-2 rounded-md bg-primary text-text-inverse text-sm font-medium hover:bg-primary-hover transition-colors"
      >
        {t('Reload page')}
      </button>
    </div>
  );
}

/**
 * Catches React render errors and shows a fallback UI instead of a white screen.
 * Wrap around route content or the entire app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return <DefaultErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
