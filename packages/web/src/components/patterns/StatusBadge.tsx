import { Badge, type BadgeVariant } from '@web/components/ui';

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
  const map = { ...defaultStatusMap, ...statusMap };
  const variant = map[status.toLowerCase()] ?? 'default';

  return (
    <Badge variant={variant} className={className}>
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </Badge>
  );
}
