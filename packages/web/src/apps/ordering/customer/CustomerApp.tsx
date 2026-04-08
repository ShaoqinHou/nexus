import { useState, useCallback } from 'react';
import { useSearch } from '@tanstack/react-router';
import { AlertCircle, QrCode } from 'lucide-react';
import { CartProvider } from '@web/apps/ordering/customer/CartProvider';
import { MenuBrowse } from '@web/apps/ordering/customer/MenuBrowse';
import { CartSheet } from '@web/apps/ordering/customer/CartSheet';
import { CartSidebar } from '@web/apps/ordering/customer/CartSidebar';
import { OrderConfirmation } from '@web/apps/ordering/customer/OrderConfirmation';
import type { Order } from '@web/apps/ordering/types';

type CustomerView =
  | { type: 'menu' }
  | { type: 'confirmation'; orderId: string };

interface CustomerAppInnerProps {
  tenantSlug: string;
  tableNumber: string;
}

function CustomerAppInner({ tenantSlug, tableNumber }: CustomerAppInnerProps) {
  const [view, setView] = useState<CustomerView>({ type: 'menu' });

  const handleOrderPlaced = useCallback((order: Order) => {
    setView({ type: 'confirmation', orderId: order.id });
  }, []);

  const handleBackToMenu = useCallback(() => {
    setView({ type: 'menu' });
  }, []);

  if (view.type === 'confirmation') {
    return (
      <OrderConfirmation
        tenantSlug={tenantSlug}
        orderId={view.orderId}
        onBackToMenu={handleBackToMenu}
      />
    );
  }

  return (
    <div className="lg:flex">
      {/* Center: Menu content (includes its own desktop category rail on the left) */}
      <div className="flex-1 min-w-0">
        <MenuBrowse tenantSlug={tenantSlug} />

        {/* Mobile/tablet: bottom sheet cart + spacer */}
        <div className="lg:hidden">
          <CartSheet
            tenantSlug={tenantSlug}
            tableNumber={tableNumber}
            onOrderPlaced={handleOrderPlaced}
          />
          {/* Spacer for fixed cart bar */}
          <div className="h-20" />
        </div>
      </div>

      {/* Right: Desktop persistent cart sidebar */}
      <aside className="hidden lg:block w-[340px] shrink-0 sticky top-0 h-screen overflow-y-auto border-l border-border bg-bg">
        <CartSidebar
          tenantSlug={tenantSlug}
          tableNumber={tableNumber}
          onOrderPlaced={handleOrderPlaced}
        />
      </aside>
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
