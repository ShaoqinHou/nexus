export interface MenuCategory {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
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
  isAvailable: number;
  sortOrder: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
  modifierGroups?: ModifierGroup[];
}

export const DIETARY_TAGS = [
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free',
  'nut-free', 'halal', 'spicy', 'new', 'popular'
] as const;
export type DietaryTag = typeof DIETARY_TAGS[number];

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

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes: string | null;
  modifiersJson: string | null;
  createdAt: string;
}

export interface SnapshotModifier {
  name: string;
  price: number;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  tenantId: string;
  sessionId: string | null;
  tableNumber: string;
  status: OrderStatus;
  notes: string | null;
  total: number;
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
}
