import type { TourStep } from '@web/platform/TourProvider';

export const CUSTOMER_TOUR_ID = 'customer-onboarding';

export const customerOnboardingSteps: TourStep[] = [
  {
    id: 'welcome',
    target: 'center',
    title: 'Welcome!',
    description:
      "Here's how to order from your table. It takes about 30 seconds.",
    placement: 'center',
    actionLabel: 'Show me!',
  },
  {
    id: 'categories',
    target: '[data-tour="category-pills"]',
    title: 'Browse the Menu',
    description:
      'Tap a category to jump to that section, or use the search icon to find specific items.',
    placement: 'bottom',
  },
  {
    id: 'add-item',
    target: '[data-tour="first-add-button"]',
    title: 'Add to Your Order',
    description:
      'Tap the + button to add an item. For customizable items, you can choose size, toppings, and more.',
    placement: 'left',
  },
  {
    id: 'cart',
    target: '[data-tour="cart-bar"]',
    title: 'Your Cart',
    description:
      'Your items appear here with the running total. Tap to review, apply a promo code, and place your order.',
    placement: 'top',
  },
  {
    id: 'done',
    target: 'center',
    title: "That's it!",
    description: 'Start browsing the menu and enjoy your meal!',
    placement: 'center',
    actionLabel: 'Start Ordering',
  },
];
