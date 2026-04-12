export const orderingKeys = {
  all: ['ordering'] as const,
  categories: () => [...orderingKeys.all, 'categories'] as const,
  itemsAll: () => [...orderingKeys.all, 'items'] as const,
  items: (categoryId?: string) =>
    [...orderingKeys.all, 'items', categoryId] as const,
  ordersAll: () => [...orderingKeys.all, 'orders'] as const,
  orders: (filters?: Record<string, string>) =>
    [...orderingKeys.all, 'orders', filters] as const,
  order: (id: string) => [...orderingKeys.all, 'order', id] as const,
  modifiers: () => [...orderingKeys.all, 'modifiers'] as const,
  itemModifiers: (itemId: string) =>
    [...orderingKeys.all, 'item-modifiers', itemId] as const,
  promotions: () => [...orderingKeys.all, 'promotions'] as const,
  combos: () => [...orderingKeys.all, 'combos'] as const,
  tableStatuses: () => [...orderingKeys.all, 'table-statuses'] as const,
  waiterCalls: () => [...orderingKeys.all, 'waiter-calls'] as const,
  feedback: () => [...orderingKeys.all, 'feedback'] as const,
  feedbackSummary: () => [...orderingKeys.all, 'feedback-summary'] as const,
  menu: () => [...orderingKeys.all, 'menu'] as const,
};
