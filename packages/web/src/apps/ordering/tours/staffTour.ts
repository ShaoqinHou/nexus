import type { TourStep } from '@web/platform/TourProvider';

export const STAFF_TOUR_ID = 'staff-onboarding';

export const staffOnboardingSteps: TourStep[] = [
  // Welcome
  {
    id: 'welcome',
    target: 'center',
    type: 'info',
    title: 'Welcome to Nexus!',
    description: "Let's set up your restaurant step by step.",
    placement: 'center',
    actionLabel: "Let's start!",
  },

  // Navigation overview
  {
    id: 'nav',
    target: '[data-tour="sidebar-nav"]',
    type: 'info',
    title: 'Your Dashboard',
    description:
      'Everything is organized into sections. We will walk through each one.',
    placement: 'right',
    route: '/ordering/orders',
  },

  // Menu -- create a category
  {
    id: 'go-menu',
    target: '[data-tour="menu-link"]',
    type: 'action',
    title: 'First, set up your menu',
    description: 'Click Menu to get started.',
    placement: 'right',
    route: '/ordering/orders',
  },
  {
    id: 'click-add-cat',
    target: '[data-tour="add-category"]',
    type: 'action',
    title: 'Create a Category',
    description:
      'Click "Add" to create your first menu category (like Starters, Mains, Drinks).',
    placement: 'bottom',
    route: '/ordering/menu',
    waitForSelector: '[data-tour="category-dialog"]',
  },
  {
    id: 'type-cat-name',
    target: '[data-tour="category-name-input"]',
    type: 'input',
    title: 'Name Your Category',
    description: 'Type a category name, like "Starters" or "Main Dishes".',
    placement: 'bottom',
    inputValue: 'Starters',
  },
  {
    id: 'save-cat',
    target: '[data-tour="category-save"]',
    type: 'action',
    title: 'Save It',
    description: 'Click to save your category.',
    placement: 'bottom',
  },

  // Menu -- create an item
  {
    id: 'click-add-item',
    target: '[data-tour="add-item"]',
    type: 'action',
    title: 'Add a Menu Item',
    description: 'Now add an item to your category.',
    placement: 'bottom',
    route: '/ordering/menu',
    waitForSelector: '[data-tour="item-dialog"]',
  },
  {
    id: 'type-item-name',
    target: '[data-tour="item-name-input"]',
    type: 'input',
    title: 'Name Your Item',
    description: 'Enter the dish name and price.',
    placement: 'bottom',
    inputValue: 'Caesar Salad',
  },
  {
    id: 'save-item',
    target: '[data-tour="item-save"]',
    type: 'action',
    title: 'Save Your Item',
    description: 'Click to save the item to your menu.',
    placement: 'bottom',
  },

  // Modifiers explanation
  {
    id: 'modifiers',
    target: '[data-tour="modifiers-link"]',
    type: 'info',
    title: 'Modifier Groups',
    description:
      'Set up sizes, toppings, and extras here. These are global defaults -- each item can customize its own prices.',
    placement: 'right',
  },

  // Theme
  {
    id: 'go-theme',
    target: '[data-tour="theme-link"]',
    type: 'action',
    title: 'Customize Your Look',
    description: 'Click Theme to brand your restaurant.',
    placement: 'right',
  },
  {
    id: 'pick-preset',
    target: '[data-tour="theme-presets"]',
    type: 'info',
    title: 'Choose a Theme',
    description:
      'Pick a preset that matches your restaurant style. You can customize colors, fonts, and upload your logo.',
    placement: 'bottom',
    route: '/ordering/settings',
  },

  // Orders
  {
    id: 'orders',
    target: '[data-tour="orders-link"]',
    type: 'action',
    title: 'Order Management',
    description: 'Click Orders to see how incoming orders work.',
    placement: 'right',
  },
  {
    id: 'orders-info',
    target: '[data-tour="order-filters"]',
    type: 'info',
    title: 'Your Order Dashboard',
    description:
      'Orders appear here in real-time. Expand to see details, advance status, handle cancellations, and print receipts.',
    placement: 'bottom',
    route: '/ordering/orders',
  },

  // Kitchen
  {
    id: 'kitchen',
    target: '[data-tour="kitchen-link"]',
    type: 'info',
    title: 'Kitchen Display',
    description:
      'Open this on a tablet in your kitchen. It shows a live board with incoming orders. Kitchen staff can tap items as they prepare them.',
    placement: 'right',
  },

  // QR
  {
    id: 'go-qr',
    target: '[data-tour="qr-link"]',
    type: 'action',
    title: 'QR Codes',
    description: 'Click to generate QR codes for your tables.',
    placement: 'right',
  },
  {
    id: 'qr-info',
    target: '[data-tour="qr-grid"]',
    type: 'info',
    title: 'Print & Place',
    description:
      'Set your table count and print. Each code opens directly to your menu for that table.',
    placement: 'bottom',
    route: '/ordering/qr',
  },

  // Done
  {
    id: 'complete',
    target: 'center',
    type: 'info',
    title: "You're Ready!",
    description:
      "Your restaurant is set up. Share the QR codes and start taking orders!",
    placement: 'center',
    actionLabel: 'Finish Tour',
  },
];
