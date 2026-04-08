import { useState, useCallback, useEffect } from 'react';
import { useSearch } from '@tanstack/react-router';
import { AlertCircle, QrCode, Clock } from 'lucide-react';
import { Button } from '@web/components/ui';
import { CartProvider } from '@web/apps/ordering/customer/CartProvider';
import { MenuBrowse } from '@web/apps/ordering/customer/MenuBrowse';
import { CartSheet } from '@web/apps/ordering/customer/CartSheet';
import { CartSidebar } from '@web/apps/ordering/customer/CartSidebar';
import { OrderConfirmation } from '@web/apps/ordering/customer/OrderConfirmation';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import { isOpenNow } from '@web/lib/theme';
import type { TenantThemeSettings } from '@web/lib/theme';
import type { Order } from '@web/apps/ordering/types';

type CustomerView =
  | { type: 'menu'; addToOrderId?: string }
  | { type: 'confirmation'; orderId: string };

interface CustomerAppInnerProps {
  tenantSlug: string;
  tableNumber: string;
}

function CustomerAppInner({ tenantSlug, tableNumber }: CustomerAppInnerProps) {
  const [view, setView] = useState<CustomerView>({ type: 'menu' });
  const { tenant } = useTenant();

  const settings = (tenant?.settings ?? {}) as TenantThemeSettings;

  // Live-refresh operating hours every 60 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  const openStatus = isOpenNow(settings.operatingHours);
  const isClosed = !openStatus.open;

  const handleOrderPlaced = useCallback((order: Order) => {
    setView({ type: 'confirmation', orderId: order.id });
  }, []);

  const handleBackToMenu = useCallback(() => {
    setView({ type: 'menu' });
  }, []);

  const handleAddItems = useCallback((orderId: string) => {
    setView({ type: 'menu', addToOrderId: orderId });
  }, []);

  if (view.type === 'confirmation') {
    return (
      <OrderConfirmation
        tenantSlug={tenantSlug}
        orderId={view.orderId}
        onBackToMenu={handleBackToMenu}
        onAddItems={handleAddItems}
      />
    );
  }

  const addToOrderId = view.type === 'menu' ? view.addToOrderId : undefined;

  return (
    <div className="lg:flex">
      {/* Closed banner */}
      {isClosed && (
        <div className="fixed top-0 left-0 right-0 z-30 bg-warning-light border-b border-warning/20">
          <div className="max-w-3xl lg:max-w-7xl mx-auto flex items-center gap-2 px-4 py-2.5">
            <Clock className="h-4 w-4 text-warning shrink-0" />
            <p className="text-sm text-warning font-medium">
              This restaurant is currently closed. Orders will be available during opening hours.
              {openStatus.nextChange && (
                <span className="text-text-secondary font-normal"> ({openStatus.nextChange})</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Adding-to-order banner */}
      {addToOrderId && (
        <div className="fixed top-0 left-0 right-0 z-30 bg-primary-light border-b border-primary/20">
          <div className="max-w-3xl lg:max-w-7xl mx-auto flex items-center justify-between px-4 py-2.5">
            <p className="text-sm text-primary font-medium">
              Adding items to order #{addToOrderId.slice(-6).toUpperCase()}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView({ type: 'confirmation', orderId: addToOrderId })}
            >
              Back to Order
            </Button>
          </div>
        </div>
      )}

      {/* Center: Menu content (includes its own desktop category rail on the left) */}
      <div className={['flex-1 min-w-0', isClosed || addToOrderId ? 'mt-10' : ''].join(' ')}>
        <MenuBrowse tenantSlug={tenantSlug} disabled={isClosed} />

        {/* Mobile/tablet: bottom sheet cart + spacer — hidden when closed */}
        {!isClosed && (
          <div className="lg:hidden">
            <CartSheet
              tenantSlug={tenantSlug}
              tableNumber={tableNumber}
              onOrderPlaced={handleOrderPlaced}
              addToOrderId={addToOrderId}
            />
            {/* Spacer for fixed cart bar */}
            <div className="h-20" />
          </div>
        )}
      </div>

      {/* Right: Desktop persistent cart sidebar — hidden when closed */}
      {!isClosed && (
        <aside className="hidden lg:block w-[340px] shrink-0 sticky top-0 h-screen overflow-y-auto border-l border-border bg-bg">
          <CartSidebar
            tenantSlug={tenantSlug}
            tableNumber={tableNumber}
            onOrderPlaced={handleOrderPlaced}
            addToOrderId={addToOrderId}
          />
        </aside>
      )}
    </div>
  );
}

interface CustomerAppProps {
  tenantSlug: string;
}

export function CustomerApp({ tenantSlug }: CustomerAppProps) {
  const search = useSearch({ strict: false }) as Record<string, string>;
  const tableNumber = search.table ?? '';

  if (!tableNumber) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="rounded-full bg-warning-light p-4 mb-4">
          <AlertCircle className="h-8 w-8 text-warning" />
        </div>
        <h2 className="text-lg font-bold text-text mb-2">
          No Table Selected
        </h2>
        <p className="text-sm text-text-secondary max-w-xs">
          Please scan the QR code at your table to start ordering.
        </p>
        <div className="mt-6 rounded-full bg-bg-muted p-6">
          <QrCode className="h-12 w-12 text-text-tertiary" />
        </div>
      </div>
    );
  }

  return (
    <CartProvider tenantSlug={tenantSlug}>
      <CustomerAppInner tenantSlug={tenantSlug} tableNumber={tableNumber} />
    </CartProvider>
  );
}
