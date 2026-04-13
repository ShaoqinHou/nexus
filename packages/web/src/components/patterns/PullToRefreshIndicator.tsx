import { Loader2 } from 'lucide-react';
import { useT } from '@web/lib/i18n';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  threshold: number;
  isRefreshing: boolean;
}

export function PullToRefreshIndicator({
  pullDistance,
  threshold,
  isRefreshing,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;

  const t = useT();
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-bg-elevated border-b border-border transition-transform duration-200 ease-out"
      style={{
        transform: `translateY(${isRefreshing ? 0 : Math.max(0, pullDistance - threshold)}px)`,
        height: isRefreshing ? '60px' : `${Math.max(0, pullDistance)}px`,
        minHeight: isRefreshing ? '60px' : '0px',
      }}
    >
      <div className="flex items-center gap-2">
        {isRefreshing ? (
          <>
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <span className="text-sm font-medium text-text">{t('Refreshing...')}</span>
          </>
        ) : pullDistance >= threshold ? (
          <>
            <Loader2 className="h-5 w-5 text-primary" style={{ transform: `rotate(${rotation}deg)` }} />
            <span className="text-sm font-medium text-text">{t('Release to refresh')}</span>
          </>
        ) : (
          <>
            <Loader2 className="h-5 w-5 text-text-tertiary" style={{ transform: `rotate(${rotation}deg)` }} />
            <span className="text-sm font-medium text-text-tertiary">{t('Pull to refresh')}</span>
          </>
        )}
      </div>
    </div>
  );
}
