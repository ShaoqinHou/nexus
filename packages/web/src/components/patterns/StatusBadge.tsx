import { Badge, type BadgeVariant } from '@web/components/ui';
import { useT } from '@web/lib/i18n';

const defaultStatusMap: Record<string, BadgeVariant> = {
  active: 'success',
  completed: 'success',
  confirmed: 'success',
  ready: 'success',
  pending: 'warning',
  preparing: 'warning',
  processing: 'warning',
  cancelled: 'error',
  failed: 'error',
  rejected: 'error',
  inactive: 'default',
  draft: 'default',
  new: 'info',
};

interface StatusBadgeProps {
  status: string;
  statusMap?: Record<string, BadgeVariant>;
  className?: string;
}

export function StatusBadge({
  status,
  statusMap,
  className,
}: StatusBadgeProps) {
  const t = useT();
  const map = { ...defaultStatusMap, ...statusMap };
  const variant = map[status.toLowerCase()] ?? 'default';
  const label = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  return (
    <Badge variant={variant} className={className}>
      {t(label)}
    </Badge>
  );
}
