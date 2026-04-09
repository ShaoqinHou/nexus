import type { TourStep } from '@web/platform/TourProvider';

export const STAFF_TOUR_ID = 'staff-onboarding';

export const staffOnboardingSteps: TourStep[] = [
  {
    id: 'welcome',
    target: 'center',
    title: 'Welcome to Nexus!',
    description:
      "Let's set up your restaurant in just a few steps. We'll walk you through everything.",
    placement: 'center',
    actionLabel: "Let's go!",
  },
  {
    id: 'nav-overview',
    target: '[data-tour="sidebar-nav"]',
    title: 'Your Navigation',
    description:
      'Everything is organized into sections: Operations for daily work, Menu for your food items, Marketing for promotions, and Management for settings.',
    placement: 'right',
    route: '/ordering/orders',
  },
  {
    id: 'menu-page',
    target: '[data-tour="add-category"]',
    title: 'Build Your Menu',
    description:
      'Start by creating categories (like Starters, Mains, Drinks) then add items to each one.',
    placement: 'bottom',
    route: '/ordering/menu',
  },
  {
    id: 'modifiers-intro',
    target: '[data-tour="modifiers-link"]',
    title: 'Customization Options',
    description:
      'Modifier groups (Size, Toppings, Spice Level) are set up globally here, then linked to individual items. Each item can have custom pricing.',
    placement: 'right',
  },
  {
    id: 'theme-page',
    target: '[data-tour="theme-presets"]',
    title: 'Make It Yours',
    description:
      'Choose a theme preset or customize your brand colors, font, and logo. Your customers will see these on the ordering page.',
    placement: 'bottom',
    route: '/ordering/settings',
  },
  {
    id: 'orders-page',
    target: '[data-tour="order-filters"]',
    title: 'Manage Orders',
    description:
      'Orders appear here in real-time. Click to expand, advance status (Pending -> Confirmed -> Preparing -> Ready), or handle cancellations.',
    placement: 'bottom',
    route: '/ordering/orders',
  },
  {
    id: 'kitchen-intro',
    target: '[data-tour="kitchen-link"]',
    title: 'Kitchen Display',
    description:
      'Open the Kitchen page on a tablet in your kitchen. It shows a live Kanban board -- tap items as they are prepared.',
    placement: 'right',
  },
  {
    id: 'qr-page',
    target: '[data-tour="qr-grid"]',
    title: 'Generate QR Codes',
    description:
      'Set your table count and print QR codes. Each table gets a unique code that opens directly to your menu.',
    placement: 'bottom',
    route: '/ordering/qr',
  },
  {
    id: 'analytics-intro',
    target: '[data-tour="analytics-link"]',
    title: 'Track Performance',
    description:
      'View revenue, top-selling items, peak hours, and promotion effectiveness. Filter by day, week, or month.',
    placement: 'right',
  },
  {
    id: 'complete',
    target: 'center',
    title: 'You\'re All Set!',
    description:
      'Your restaurant is ready to go. Share the QR codes with your tables and start taking orders. You can replay this tour anytime from the sidebar.',
    placement: 'center',
    actionLabel: 'Start Using Nexus',
  },
];
