import type { OrderStatus, OrderItemStatus, PaymentStatus } from '@nexus/shared';
export type { OrderStatus, OrderItemStatus, PaymentStatus };
export { DIETARY_TAGS, ALLERGENS } from '@nexus/shared';
export type { DietaryTag, Allergen } from '@nexus/shared';

// --- API Response Interfaces ---
// These represent the API response shape (with transformations like nested items).
// The underlying constants (OrderStatus, DietaryTag, etc.) come from @nexus/shared.

export type CategoryStation = 'all' | 'kitchen' | 'bar';

export interface MenuCategory {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  station: CategoryStation;
  sortOrder: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  tags: string | null;
  allergens: string | null;
  isAvailable: number;
  isSoldOut?: number | null;
  soldOutUntil?: string | null;
  sortOrder: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
  modifierGroups?: ModifierGroup[];
}

export interface ModifierGroup {
  id: string;
  tenantId: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  sortOrder: number;
  isActive: number;
  options: ModifierOption[];
}

export interface ModifierOption {
  id: string;
  groupId: string;
  name: string;
  priceDelta: number;
  isDefault: number;
  sortOrder: number;
  isActive: number;
}

export type PaymentMethod = 'cash' | 'card' | 'qr_pay' | 'voucher' | 'complimentary';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  qr_pay: 'QR Pay',
  voucher: 'Voucher',
  complimentary: 'Complimentary',
};

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes: string | null;
  allergens: string | null;
  modifiersJson: string | null;
  status: OrderItemStatus;
  completedAt: string | null;
  createdAt: string;
}

export interface SnapshotModifier {
  name: string;
  price: number;
}

export interface Order {
  id: string;
  tenantId: string;
  sessionId: string | null;
  tableNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod | null;
  notes: string | null;
  staffNotes?: string | null;
  total: number;
  discountAmount: number | null;
  taxAmount: number | null;
  discountOverride?: number | null;
  overrideReason?: string | null;
  overrideBy?: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Promotion {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  type: 'percentage' | 'fixed_amount';
  discountValue: number;
  minOrderAmount: number | null;
  applicableCategories: string | null;
  startsAt: string;
  endsAt: string | null;
  maxUses: number | null;
  currentUses: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
  promoCodes?: PromoCode[];
}

export interface PromoCode {
  id: string;
  tenantId: string;
  promotionId: string;
  code: string;
  usageLimit: number | null;
  usageCount: number;
  isActive: number;
  createdAt: string;
}

// --- Combo Deals ---

export interface ComboDeal {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  categoryId: string | null;
  sortOrder: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
  slots: ComboSlot[];
}

export interface ComboSlot {
  id: string;
  comboDealId: string;
  name: string;
  sortOrder: number;
  minSelections: number;
  maxSelections: number;
  options: ComboSlotOption[];
}

export interface ComboSlotOption {
  id: string;
  comboSlotId: string;
  menuItemId: string;
  priceModifier: number;
  isDefault: number;
  sortOrder: number;
  menuItemName?: string;
  menuItemPrice?: number;
  modifierGroups?: ModifierGroup[];
}
