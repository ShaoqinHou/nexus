import { registerApp } from '@web/platform/registry';
import { UtensilsCrossed, LayoutDashboard, BookOpen, QrCode, Settings2, Tag, Package, ChefHat, BarChart3, Users } from 'lucide-react';
import { staffOnboardingSteps, STAFF_TOUR_ID } from './tours/staffTour';
import { cleanupStaffTourData } from './tours/cleanup';

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
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Staff', path: '/staff', icon: Users },
    { label: 'Settings', path: '/settings', icon: Settings2 },
  ],
  merchantRoutes: [],
  customerRoutes: [],
  tours: [
    { id: STAFF_TOUR_ID, label: 'Guided Tour', steps: staffOnboardingSteps, onEnd: cleanupStaffTourData },
  ],
});
