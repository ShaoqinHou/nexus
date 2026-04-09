import type { TourStep } from '@web/platform/TourProvider';

export const CUSTOMER_TOUR_ID = 'customer-onboarding';

export const customerOnboardingSteps: TourStep[] = [
  {
    id: 'welcome',
    target: 'center',
    type: 'info',
    title: 'Welcome!',
    description: 'Ordering is easy. Let us show you how!',
    placement: 'center',
    actionLabel: 'Show me',
  },
  {
    id: 'categories',
    target: '[data-tour="category-pills"]',
    type: 'info',
    title: 'Browse the Menu',
    description:
      'Tap a category to jump to that section. Use the search icon to find specific items.',
    placement: 'bottom',
  },
  {
    id: 'add-item',
    target: '[data-tour="first-add-button"]',
    type: 'action',
    title: 'Add an Item',
    description: 'Tap the + button to add this item to your cart.',
    placement: 'left',
  },
  {
    id: 'cart',
    target: '[data-tour="cart-bar"]',
    type: 'info',
    title: 'Your Cart',
    description:
      'Your items and total appear here. Tap to review and place your order.',
    placement: 'top',
  },
  {
    id: 'done',
    target: 'center',
    type: 'info',
    title: "That's it!",
    description: 'Start browsing the menu and enjoy your meal!',
    placement: 'center',
    actionLabel: 'Start Ordering',
  },
];
