// Order statuses
export const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

// Staff roles
export const STAFF_ROLES = ['owner', 'manager', 'staff'] as const;
export type StaffRole = typeof STAFF_ROLES[number];

// Promotion types
export const PROMOTION_TYPES = ['percentage', 'fixed_amount'] as const;
export type PromotionType = typeof PROMOTION_TYPES[number];

// Dietary tags
export const DIETARY_TAGS = [
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free',
  'nut-free', 'halal', 'spicy', 'new', 'popular'
] as const;
export type DietaryTag = typeof DIETARY_TAGS[number];

// Order status display helpers
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const ORDER_STATUS_FLOW: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
};

export const ORDER_FLOW_LABELS: Partial<Record<OrderStatus, string>> = {
  pending: 'Confirm',
  confirmed: 'Start Preparing',
  preparing: 'Mark Ready',
  ready: 'Mark Delivered',
};
