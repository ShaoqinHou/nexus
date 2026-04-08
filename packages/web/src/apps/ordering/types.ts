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
  isAvailable: number;
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
