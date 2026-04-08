import { registerApp } from '@web/platform/registry';
import { UtensilsCrossed, LayoutDashboard, BookOpen, QrCode, Settings2 } from 'lucide-react';

registerApp({
  id: 'ordering',
  name: 'Ordering',
  icon: UtensilsCrossed,
  basePath: 'ordering',
  navItems: [
    { label: 'Orders', path: '/orders', icon: LayoutDashboard },
    { label: 'Menu', path: '/menu', icon: BookOpen },
    { label: 'Modifiers', path: '/modifiers', icon: Settings2 },
    { label: 'QR Codes', path: '/qr', icon: QrCode },
  ],
  merchantRoutes: [],
  customerRoutes: [],
});
