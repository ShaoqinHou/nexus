import { registerApp } from '@web/platform/registry';
import { UtensilsCrossed, LayoutDashboard, BookOpen, QrCode, Settings2, Tag, Package, Palette, ChefHat } from 'lucide-react';

registerApp({
  id: 'ordering',
  name: 'Ordering',
  icon: UtensilsCrossed,
  basePath: 'ordering',
  navItems: [
    { label: 'Orders', path: '/orders', icon: LayoutDashboard },
    { label: 'Kitchen', path: '/kitchen', icon: ChefHat },
    { label: 'Menu', path: '/menu', icon: BookOpen },
    { label: 'Combos', path: '/combos', icon: Package },
    { label: 'Modifiers', path: '/modifiers', icon: Settings2 },
    { label: 'Promotions', path: '/promotions', icon: Tag },
    { label: 'QR Codes', path: '/qr', icon: QrCode },
    { label: 'Theme', path: '/settings', icon: Palette },
  ],
  merchantRoutes: [],
  customerRoutes: [],
});
