import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { db } from './client.js';
import {
  tenants,
  staff,
  menuCategories,
  menuItems,
  orders,
  orderItems,
  customerSessions,
  modifierGroups,
  modifierOptions,
  menuItemModifierGroups,
  promotions,
  promoCodes,
  comboDeals,
  comboSlots,
  comboSlotOptions,
} from './schema.js';

function seed() {
  console.log('Seeding Nexus demo data...');

  // --- Check tables exist ---
  try {
    db.select().from(tenants).limit(1).all();
  } catch {
    console.error('Error: tables do not exist. Run `npm run db:push` first.');
    process.exit(1);
  }

  // --- Idempotency: delete existing demo tenants and all their data ---
  function deleteTenantBySlug(slug: string) {
    const existing = db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .get();

    if (!existing) return;

    console.log(`Existing '${slug}' tenant found — removing...`);

    // Delete combo slot options, slots, deals (children first)
    const demoCombos = db
      .select({ id: comboDeals.id })
      .from(comboDeals)
      .where(eq(comboDeals.tenantId, existing.id))
      .all();
    for (const combo of demoCombos) {
      const slots = db
        .select({ id: comboSlots.id })
        .from(comboSlots)
        .where(eq(comboSlots.comboDealId, combo.id))
        .all();
      for (const slot of slots) {
        db.delete(comboSlotOptions).where(eq(comboSlotOptions.comboSlotId, slot.id)).run();
      }
      db.delete(comboSlots).where(eq(comboSlots.comboDealId, combo.id)).run();
    }
    db.delete(comboDeals).where(eq(comboDeals.tenantId, existing.id)).run();

    // Delete promo codes, then promotions
    db.delete(promoCodes).where(eq(promoCodes.tenantId, existing.id)).run();
    db.delete(promotions).where(eq(promotions.tenantId, existing.id)).run();

    // Delete modifier links, options, groups (children first)
    const demoGroups = db
      .select({ id: modifierGroups.id })
      .from(modifierGroups)
      .where(eq(modifierGroups.tenantId, existing.id))
      .all();
    for (const group of demoGroups) {
      db.delete(menuItemModifierGroups).where(eq(menuItemModifierGroups.modifierGroupId, group.id)).run();
      db.delete(modifierOptions).where(eq(modifierOptions.groupId, group.id)).run();
    }
    db.delete(modifierGroups).where(eq(modifierGroups.tenantId, existing.id)).run();

    // Delete order items for demo orders
    const demoOrders = db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.tenantId, existing.id))
      .all();
    for (const order of demoOrders) {
      db.delete(orderItems).where(eq(orderItems.orderId, order.id)).run();
    }

    // Delete orders
    db.delete(orders).where(eq(orders.tenantId, existing.id)).run();

    // Delete customer sessions
    db.delete(customerSessions)
      .where(eq(customerSessions.tenantId, existing.id))
      .run();

    // Delete menu items
    db.delete(menuItems).where(eq(menuItems.tenantId, existing.id)).run();

    // Delete menu categories
    db.delete(menuCategories)
      .where(eq(menuCategories.tenantId, existing.id))
      .run();

    // Delete staff
    db.delete(staff).where(eq(staff.tenantId, existing.id)).run();

    // Delete tenant
    db.delete(tenants).where(eq(tenants.id, existing.id)).run();
  }

  deleteTenantBySlug('demo');
  deleteTenantBySlug('sakura');

  // --- Create tenant ---
  const tenantId = nanoid();
  const now = new Date().toISOString();

  const settings = JSON.stringify({
    brandColor: '#ea580c',
    preset: 'vibrant-street',
    fontFamily: 'Space Grotesk',
    borderRadius: 'pill',
    surfaceStyle: 'flat',
    coverImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=128&q=80',
    operatingHours: [
      { day: 0, open: '10:00', close: '21:00' },
      { day: 1, open: '09:00', close: '22:00' },
      { day: 2, open: '09:00', close: '22:00' },
      { day: 3, open: '09:00', close: '22:00' },
      { day: 4, open: '09:00', close: '22:00' },
      { day: 5, open: '09:00', close: '23:00' },
      { day: 6, open: '10:00', close: '23:00' },
    ],
    taxRate: 15,
    taxInclusive: true,
    taxLabel: 'GST',
  });

  db.insert(tenants)
    .values({
      id: tenantId,
      name: 'Demo Restaurant',
      slug: 'demo',
      settings,
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  console.log('Created tenant: Demo Restaurant (demo)');

  // --- Create owner staff ---
  const passwordHash = bcrypt.hashSync('password123', 10);

  db.insert(staff)
    .values({
      id: nanoid(),
      tenantId,
      email: 'demo@example.com',
      passwordHash,
      name: 'Demo Owner',
      role: 'owner',
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  console.log('Created owner: demo@example.com');

  // --- Create categories ---
  const categoryData = [
    { name: 'Starters', sortOrder: 0 },
    { name: 'Mains', sortOrder: 1 },
    { name: 'Desserts', sortOrder: 2 },
    { name: 'Drinks', sortOrder: 3 },
  ];

  const categoryIds: Record<string, string> = {};

  for (const cat of categoryData) {
    const id = nanoid();
    categoryIds[cat.name] = id;
    db.insert(menuCategories)
      .values({
        id,
        tenantId,
        name: cat.name,
        sortOrder: cat.sortOrder,
        isActive: 1,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  // --- Create menu items ---
  interface ItemDef {
    name: string;
    description: string;
    price: number;
    category: string;
    sortOrder: number;
    isFeatured?: number;
    imageUrl?: string;
    tags?: string;
    allergens?: string;
  }

  const itemDefs: ItemDef[] = [
    // Starters
    { name: 'Garlic Bread', description: 'Crispy bread with garlic butter', price: 8.5, category: 'Starters', sortOrder: 0, imageUrl: 'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=400&q=80', tags: 'vegetarian', allergens: 'gluten,dairy' },
    { name: 'Spring Rolls', description: 'Vegetable spring rolls with sweet chili', price: 10.0, category: 'Starters', sortOrder: 1, isFeatured: 1, imageUrl: 'https://images.unsplash.com/photo-1548507235-a25a6c28bda8?w=400&q=80', tags: 'vegetarian,vegan', allergens: 'gluten,soy' },
    { name: 'Soup of the Day', description: "Ask your server for today's selection", price: 9.5, category: 'Starters', sortOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80' },
    // Mains
    { name: 'Margherita Pizza', description: 'Classic tomato, mozzarella, fresh basil', price: 18.0, category: 'Mains', sortOrder: 0, isFeatured: 1, imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=80', tags: 'vegetarian,popular', allergens: 'gluten,dairy' },
    { name: 'Fish & Chips', description: 'Beer-battered fish with hand-cut chips', price: 22.5, category: 'Mains', sortOrder: 1, imageUrl: 'https://images.unsplash.com/photo-1580217593608-61931cefc821?w=400&q=80', allergens: 'gluten,fish' },
    { name: 'Chicken Parmesan', description: 'Crumbed chicken with napoli sauce', price: 24.0, category: 'Mains', sortOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=400&q=80', allergens: 'gluten,dairy,eggs' },
    { name: 'Beef Burger', description: 'Angus beef patty with lettuce, tomato, cheese', price: 19.5, category: 'Mains', sortOrder: 3, isFeatured: 1, imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80', tags: 'popular', allergens: 'gluten,dairy,sesame' },
    { name: 'Pad Thai', description: 'Stir-fried rice noodles with prawns', price: 17.0, category: 'Mains', sortOrder: 4, imageUrl: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400&q=80', tags: 'spicy', allergens: 'peanuts,shellfish,soy' },
    // Desserts
    { name: 'Tiramisu', description: 'Classic Italian coffee dessert', price: 12.0, category: 'Desserts', sortOrder: 0, isFeatured: 1, imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=80', tags: 'vegetarian', allergens: 'gluten,dairy,eggs' },
    { name: 'Cheesecake', description: 'New York style with berry coulis', price: 11.5, category: 'Desserts', sortOrder: 1, imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&q=80', tags: 'vegetarian', allergens: 'gluten,dairy,eggs' },
    { name: 'Ice Cream Sundae', description: 'Three scoops with chocolate sauce', price: 8.0, category: 'Desserts', sortOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=80', tags: 'vegetarian,gluten-free', allergens: 'dairy' },
    // Drinks
    { name: 'Cola', description: '330ml can', price: 4.5, category: 'Drinks', sortOrder: 0 },
    { name: 'Fresh Lemonade', description: 'House-made with mint', price: 5.0, category: 'Drinks', sortOrder: 1, imageUrl: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&q=80', tags: 'vegan,gluten-free' },
    { name: 'Craft Beer', description: 'Local pale ale, 500ml', price: 8.0, category: 'Drinks', sortOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&q=80', tags: 'vegan', allergens: 'gluten' },
    { name: 'House Wine', description: 'Red or white, 150ml glass', price: 12.0, category: 'Drinks', sortOrder: 3, imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', tags: 'vegan,gluten-free', allergens: 'sulphites' },
  ];

  const itemIds: Record<string, string> = {};

  for (const item of itemDefs) {
    const id = nanoid();
    itemIds[item.name] = id;
    db.insert(menuItems)
      .values({
        id,
        tenantId,
        categoryId: categoryIds[item.category],
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl ?? null,
        tags: item.tags ?? null,
        allergens: item.allergens ?? null,
        isAvailable: 1,
        isFeatured: item.isFeatured ?? 0,
        sortOrder: item.sortOrder,
        isActive: 1,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  console.log(`Created 4 categories with ${itemDefs.length} items`);

  // --- Create modifier groups + options ---
  const sizeGroup = db.insert(modifierGroups).values({
    id: nanoid(),
    tenantId,
    name: 'Size',
    minSelections: 1,
    maxSelections: 1,
    sortOrder: 0,
    isActive: 1,
    createdAt: now,
    updatedAt: now,
  }).returning().get();

  const sizeRegularId = nanoid();
  const sizeLargeId = nanoid();
  db.insert(modifierOptions).values([
    { id: sizeRegularId, groupId: sizeGroup.id, name: 'Regular', priceDelta: 0, isDefault: 1, sortOrder: 0, isActive: 1, createdAt: now, updatedAt: now },
    { id: sizeLargeId, groupId: sizeGroup.id, name: 'Large', priceDelta: 2.5, isDefault: 0, sortOrder: 1, isActive: 1, createdAt: now, updatedAt: now },
  ]).run();

  const toppingsGroup = db.insert(modifierGroups).values({
    id: nanoid(),
    tenantId,
    name: 'Extra Toppings',
    minSelections: 0,
    maxSelections: 3,
    sortOrder: 1,
    isActive: 1,
    createdAt: now,
    updatedAt: now,
  }).returning().get();

  const extraCheeseId = nanoid();
  db.insert(modifierOptions).values([
    { id: extraCheeseId, groupId: toppingsGroup.id, name: 'Extra Cheese', priceDelta: 1.5, isDefault: 0, sortOrder: 0, isActive: 1, createdAt: now, updatedAt: now },
    { id: nanoid(), groupId: toppingsGroup.id, name: 'Bacon', priceDelta: 2.0, isDefault: 0, sortOrder: 1, isActive: 1, createdAt: now, updatedAt: now },
    { id: nanoid(), groupId: toppingsGroup.id, name: 'Avocado', priceDelta: 2.5, isDefault: 0, sortOrder: 2, isActive: 1, createdAt: now, updatedAt: now },
    { id: nanoid(), groupId: toppingsGroup.id, name: 'Jalapeños', priceDelta: 1.0, isDefault: 0, sortOrder: 3, isActive: 1, createdAt: now, updatedAt: now },
  ]).run();

  const spiceGroup = db.insert(modifierGroups).values({
    id: nanoid(),
    tenantId,
    name: 'Spice Level',
    minSelections: 1,
    maxSelections: 1,
    sortOrder: 2,
    isActive: 1,
    createdAt: now,
    updatedAt: now,
  }).returning().get();

  db.insert(modifierOptions).values([
    { id: nanoid(), groupId: spiceGroup.id, name: 'Mild', priceDelta: 0, isDefault: 1, sortOrder: 0, isActive: 1, createdAt: now, updatedAt: now },
    { id: nanoid(), groupId: spiceGroup.id, name: 'Medium', priceDelta: 0, isDefault: 0, sortOrder: 1, isActive: 1, createdAt: now, updatedAt: now },
    { id: nanoid(), groupId: spiceGroup.id, name: 'Hot', priceDelta: 0, isDefault: 0, sortOrder: 2, isActive: 1, createdAt: now, updatedAt: now },
  ]).run();

  // Link modifier groups to menu items (with per-item price overrides where needed)
  // Burger: Large +$3.00 (override from default $2.50)
  // Pizza: Large +$4.00 (override)
  // Fish & Chips: Large +$2.50 (uses default, no override needed)
  db.insert(menuItemModifierGroups).values([
    { menuItemId: itemIds['Margherita Pizza'], modifierGroupId: sizeGroup.id, sortOrder: 0, priceOverrides: JSON.stringify({ [sizeLargeId]: { priceDelta: 4.00 } }) },
    { menuItemId: itemIds['Margherita Pizza'], modifierGroupId: toppingsGroup.id, sortOrder: 1 },
    { menuItemId: itemIds['Beef Burger'], modifierGroupId: sizeGroup.id, sortOrder: 0, priceOverrides: JSON.stringify({ [sizeLargeId]: { priceDelta: 3.00 } }) },
    { menuItemId: itemIds['Beef Burger'], modifierGroupId: toppingsGroup.id, sortOrder: 1 },
    { menuItemId: itemIds['Fish & Chips'], modifierGroupId: sizeGroup.id, sortOrder: 0 },
    { menuItemId: itemIds['Pad Thai'], modifierGroupId: spiceGroup.id, sortOrder: 0 },
    { menuItemId: itemIds['Chicken Parmesan'], modifierGroupId: sizeGroup.id, sortOrder: 0 },
  ]).run();

  console.log(`Created 3 modifier groups with options`);

  // --- Create promotions + promo codes ---
  const promoId1 = nanoid();
  db.insert(promotions).values({
    id: promoId1,
    tenantId,
    name: 'Welcome Discount',
    description: '15% off your first order',
    type: 'percentage',
    discountValue: 15,
    minOrderAmount: null,
    applicableCategories: null,
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: 1,
    createdAt: now,
    updatedAt: now,
  }).run();

  db.insert(promoCodes).values({
    id: nanoid(),
    tenantId,
    promotionId: promoId1,
    code: 'WELCOME15',
    usageLimit: 100,
    usageCount: 0,
    isActive: 1,
    createdAt: now,
  }).run();

  const promoId2 = nanoid();
  db.insert(promotions).values({
    id: promoId2,
    tenantId,
    name: '$5 Off Over $30',
    description: '$5 off when you spend $30 or more',
    type: 'fixed_amount',
    discountValue: 5,
    minOrderAmount: 30,
    applicableCategories: null,
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: 1,
    createdAt: now,
    updatedAt: now,
  }).run();

  db.insert(promoCodes).values({
    id: nanoid(),
    tenantId,
    promotionId: promoId2,
    code: 'SAVE5',
    usageLimit: 50,
    usageCount: 0,
    isActive: 1,
    createdAt: now,
  }).run();

  console.log(`Created 2 promotions with promo codes`);

  // --- Create combo deals ---

  // Combo 1: Classic Meal Deal ($22.00)
  const combo1 = db.insert(comboDeals).values({
    id: nanoid(),
    tenantId,
    name: 'Classic Meal Deal',
    description: 'Pick a main, a side, and a drink',
    basePrice: 22.0,
    sortOrder: 0,
    isActive: 1,
    createdAt: now,
    updatedAt: now,
  }).returning().get();

  const combo1Slot1 = db.insert(comboSlots).values({
    id: nanoid(),
    comboDealId: combo1.id,
    name: 'Choose your Main',
    sortOrder: 0,
    minSelections: 1,
    maxSelections: 1,
  }).returning().get();

  db.insert(comboSlotOptions).values([
    { id: nanoid(), comboSlotId: combo1Slot1.id, menuItemId: itemIds['Margherita Pizza'], priceModifier: 0, isDefault: 0, sortOrder: 0 },
    { id: nanoid(), comboSlotId: combo1Slot1.id, menuItemId: itemIds['Beef Burger'], priceModifier: 0, isDefault: 0, sortOrder: 1 },
    { id: nanoid(), comboSlotId: combo1Slot1.id, menuItemId: itemIds['Fish & Chips'], priceModifier: 2.0, isDefault: 0, sortOrder: 2 },
    { id: nanoid(), comboSlotId: combo1Slot1.id, menuItemId: itemIds['Chicken Parmesan'], priceModifier: 3.0, isDefault: 0, sortOrder: 3 },
  ]).run();

  const combo1Slot2 = db.insert(comboSlots).values({
    id: nanoid(),
    comboDealId: combo1.id,
    name: 'Choose your Side',
    sortOrder: 1,
    minSelections: 1,
    maxSelections: 1,
  }).returning().get();

  db.insert(comboSlotOptions).values([
    { id: nanoid(), comboSlotId: combo1Slot2.id, menuItemId: itemIds['Garlic Bread'], priceModifier: 0, isDefault: 0, sortOrder: 0 },
    { id: nanoid(), comboSlotId: combo1Slot2.id, menuItemId: itemIds['Soup of the Day'], priceModifier: 0, isDefault: 0, sortOrder: 1 },
  ]).run();

  const combo1Slot3 = db.insert(comboSlots).values({
    id: nanoid(),
    comboDealId: combo1.id,
    name: 'Choose your Drink',
    sortOrder: 2,
    minSelections: 1,
    maxSelections: 1,
  }).returning().get();

  db.insert(comboSlotOptions).values([
    { id: nanoid(), comboSlotId: combo1Slot3.id, menuItemId: itemIds['Cola'], priceModifier: 0, isDefault: 0, sortOrder: 0 },
    { id: nanoid(), comboSlotId: combo1Slot3.id, menuItemId: itemIds['Fresh Lemonade'], priceModifier: 0.5, isDefault: 0, sortOrder: 1 },
    { id: nanoid(), comboSlotId: combo1Slot3.id, menuItemId: itemIds['Craft Beer'], priceModifier: 3.5, isDefault: 0, sortOrder: 2 },
  ]).run();

  // Combo 2: Dessert Duo ($18.00)
  const combo2 = db.insert(comboDeals).values({
    id: nanoid(),
    tenantId,
    name: 'Dessert Duo',
    description: 'Pick 2 desserts and optionally add a drink',
    basePrice: 18.0,
    sortOrder: 1,
    isActive: 1,
    createdAt: now,
    updatedAt: now,
  }).returning().get();

  const combo2Slot1 = db.insert(comboSlots).values({
    id: nanoid(),
    comboDealId: combo2.id,
    name: 'Pick 2 Desserts',
    sortOrder: 0,
    minSelections: 2,
    maxSelections: 2,
  }).returning().get();

  db.insert(comboSlotOptions).values([
    { id: nanoid(), comboSlotId: combo2Slot1.id, menuItemId: itemIds['Tiramisu'], priceModifier: 0, isDefault: 0, sortOrder: 0 },
    { id: nanoid(), comboSlotId: combo2Slot1.id, menuItemId: itemIds['Cheesecake'], priceModifier: 0, isDefault: 0, sortOrder: 1 },
    { id: nanoid(), comboSlotId: combo2Slot1.id, menuItemId: itemIds['Ice Cream Sundae'], priceModifier: 0, isDefault: 0, sortOrder: 2 },
  ]).run();

  const combo2Slot2 = db.insert(comboSlots).values({
    id: nanoid(),
    comboDealId: combo2.id,
    name: 'Add a Drink',
    sortOrder: 1,
    minSelections: 0,
    maxSelections: 1,
  }).returning().get();

  db.insert(comboSlotOptions).values([
    { id: nanoid(), comboSlotId: combo2Slot2.id, menuItemId: itemIds['Cola'], priceModifier: 0, isDefault: 0, sortOrder: 0 },
    { id: nanoid(), comboSlotId: combo2Slot2.id, menuItemId: itemIds['Fresh Lemonade'], priceModifier: 0.5, isDefault: 0, sortOrder: 1 },
    { id: nanoid(), comboSlotId: combo2Slot2.id, menuItemId: itemIds['House Wine'], priceModifier: 4.0, isDefault: 0, sortOrder: 2 },
  ]).run();

  console.log(`Created 2 combo deals`);

  // --- Create sample orders ---
  interface OrderItemDef {
    name: string;
    quantity: number;
    modifiers?: Array<{ name: string; price: number }>;
  }

  interface OrderDef {
    tableNumber: string;
    status: 'pending' | 'confirmed' | 'preparing' | 'delivered';
    minutesAgo: number;
    items: OrderItemDef[];
  }

  const orderDefs: OrderDef[] = [
    {
      tableNumber: '1',
      status: 'pending',
      minutesAgo: 5,
      items: [
        { name: 'Garlic Bread', quantity: 1 },
        { name: 'Margherita Pizza', quantity: 1, modifiers: [{ name: 'Large', price: 4.00 }] },
      ],
    },
    {
      tableNumber: '3',
      status: 'confirmed',
      minutesAgo: 15,
      items: [
        { name: 'Spring Rolls', quantity: 2 },
        { name: 'Fish & Chips', quantity: 1 },
        { name: 'Cola', quantity: 2 },
      ],
    },
    {
      tableNumber: '5',
      status: 'preparing',
      minutesAgo: 30,
      items: [
        { name: 'Beef Burger', quantity: 2, modifiers: [{ name: 'Large', price: 3.00 }, { name: 'Extra Cheese', price: 1.50 }] },
        { name: 'Craft Beer', quantity: 2 },
      ],
    },
    {
      tableNumber: '2',
      status: 'delivered',
      minutesAgo: 60,
      items: [
        { name: 'Chicken Parmesan', quantity: 1 },
        { name: 'Cheesecake', quantity: 1 },
        { name: 'House Wine', quantity: 1 },
      ],
    },
  ];

  // Build a price lookup from itemDefs
  const priceLookup: Record<string, number> = {};
  for (const item of itemDefs) {
    priceLookup[item.name] = item.price;
  }

  for (const orderDef of orderDefs) {
    // Calculate total (including modifier prices)
    const total = orderDef.items.reduce(
      (sum, item) => {
        const modifierTotal = (item.modifiers ?? []).reduce((ms, m) => ms + m.price, 0);
        return sum + (priceLookup[item.name] + modifierTotal) * item.quantity;
      },
      0
    );

    const createdAt = new Date(
      Date.now() - orderDef.minutesAgo * 60 * 1000
    ).toISOString();

    const orderId = nanoid();
    db.insert(orders)
      .values({
        id: orderId,
        tenantId,
        tableNumber: orderDef.tableNumber,
        status: orderDef.status,
        total,
        createdAt,
        updatedAt: createdAt,
      })
      .run();

    // Insert order items with snapshot name + price + modifiers
    for (const item of orderDef.items) {
      const modifierTotal = (item.modifiers ?? []).reduce((ms, m) => ms + m.price, 0);
      db.insert(orderItems)
        .values({
          id: nanoid(),
          orderId,
          menuItemId: itemIds[item.name],
          name: item.name,
          price: priceLookup[item.name] + modifierTotal,
          quantity: item.quantity,
          modifiersJson: item.modifiers ? JSON.stringify(item.modifiers) : null,
          createdAt,
        })
        .run();
    }
  }

  console.log(`Created ${orderDefs.length} sample orders`);

  // --- Create additional orders for analytics (spread over last 7 days) ---

  interface AnalyticsOrderDef {
    tableNumber: string;
    status: 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled';
    hoursAgo: number;
    items: Array<{ name: string; quantity: number }>;
    promoCodeId?: string;
    discountAmount?: number;
  }

  // Collect promo code IDs for some orders
  const welcomeCode = db
    .select()
    .from(promoCodes)
    .where(eq(promoCodes.tenantId, tenantId))
    .all();
  const welcomeCodeId = welcomeCode.length > 0 ? welcomeCode[0].id : undefined;
  const saveCodeId = welcomeCode.length > 1 ? welcomeCode[1].id : undefined;

  const analyticsOrders: AnalyticsOrderDef[] = [
    // Day 1 (yesterday) — busy lunch
    { tableNumber: '2', status: 'delivered', hoursAgo: 26, items: [{ name: 'Margherita Pizza', quantity: 1 }, { name: 'Cola', quantity: 1 }] },
    { tableNumber: '4', status: 'delivered', hoursAgo: 25, items: [{ name: 'Fish & Chips', quantity: 2 }, { name: 'Craft Beer', quantity: 2 }] },
    { tableNumber: '6', status: 'delivered', hoursAgo: 24, items: [{ name: 'Beef Burger', quantity: 1 }, { name: 'Garlic Bread', quantity: 1 }, { name: 'Fresh Lemonade', quantity: 1 }] },
    // Day 1 dinner
    { tableNumber: '1', status: 'delivered', hoursAgo: 20, items: [{ name: 'Chicken Parmesan', quantity: 2 }, { name: 'House Wine', quantity: 2 }, { name: 'Tiramisu', quantity: 2 }] },
    { tableNumber: '3', status: 'delivered', hoursAgo: 19, items: [{ name: 'Pad Thai', quantity: 1 }, { name: 'Spring Rolls', quantity: 1 }], promoCodeId: welcomeCodeId, discountAmount: 4.05 },

    // Day 2
    { tableNumber: '5', status: 'delivered', hoursAgo: 50, items: [{ name: 'Soup of the Day', quantity: 2 }, { name: 'Margherita Pizza', quantity: 1 }] },
    { tableNumber: '2', status: 'delivered', hoursAgo: 48, items: [{ name: 'Beef Burger', quantity: 2 }, { name: 'Ice Cream Sundae', quantity: 2 }, { name: 'Cola', quantity: 2 }] },
    { tableNumber: '7', status: 'cancelled', hoursAgo: 47, items: [{ name: 'Fish & Chips', quantity: 1 }] },

    // Day 3
    { tableNumber: '1', status: 'delivered', hoursAgo: 74, items: [{ name: 'Cheesecake', quantity: 3 }, { name: 'Fresh Lemonade', quantity: 3 }] },
    { tableNumber: '4', status: 'delivered', hoursAgo: 72, items: [{ name: 'Chicken Parmesan', quantity: 1 }, { name: 'Garlic Bread', quantity: 1 }, { name: 'Craft Beer', quantity: 1 }] },

    // Day 4
    { tableNumber: '3', status: 'delivered', hoursAgo: 98, items: [{ name: 'Margherita Pizza', quantity: 2 }, { name: 'Cola', quantity: 2 }] },
    { tableNumber: '6', status: 'delivered', hoursAgo: 96, items: [{ name: 'Pad Thai', quantity: 2 }, { name: 'Spring Rolls', quantity: 2 }], promoCodeId: saveCodeId, discountAmount: 5.0 },
    { tableNumber: '2', status: 'delivered', hoursAgo: 93, items: [{ name: 'Fish & Chips', quantity: 1 }, { name: 'Tiramisu', quantity: 1 }, { name: 'House Wine', quantity: 1 }] },

    // Day 5
    { tableNumber: '1', status: 'delivered', hoursAgo: 122, items: [{ name: 'Beef Burger', quantity: 3 }, { name: 'Craft Beer', quantity: 3 }] },
    { tableNumber: '5', status: 'delivered', hoursAgo: 120, items: [{ name: 'Chicken Parmesan', quantity: 1 }, { name: 'Cheesecake', quantity: 1 }] },

    // Day 6
    { tableNumber: '4', status: 'delivered', hoursAgo: 146, items: [{ name: 'Garlic Bread', quantity: 2 }, { name: 'Margherita Pizza', quantity: 2 }, { name: 'House Wine', quantity: 2 }] },
    { tableNumber: '7', status: 'delivered', hoursAgo: 144, items: [{ name: 'Soup of the Day', quantity: 1 }, { name: 'Pad Thai', quantity: 1 }, { name: 'Ice Cream Sundae', quantity: 1 }] },

    // Day 7
    { tableNumber: '2', status: 'delivered', hoursAgo: 170, items: [{ name: 'Fish & Chips', quantity: 2 }, { name: 'Fresh Lemonade', quantity: 2 }] },
    { tableNumber: '3', status: 'delivered', hoursAgo: 168, items: [{ name: 'Beef Burger', quantity: 1 }, { name: 'Spring Rolls', quantity: 1 }, { name: 'Cola', quantity: 1 }], promoCodeId: welcomeCodeId, discountAmount: 5.1 },
    { tableNumber: '6', status: 'delivered', hoursAgo: 166, items: [{ name: 'Chicken Parmesan', quantity: 2 }, { name: 'Tiramisu', quantity: 2 }, { name: 'House Wine', quantity: 2 }] },
  ];

  for (const orderDef of analyticsOrders) {
    const total = orderDef.items.reduce(
      (sum, item) => sum + priceLookup[item.name] * item.quantity,
      0,
    );

    const discount = orderDef.discountAmount ?? 0;
    const finalTotal = Math.round((total - discount) * 100) / 100;

    const createdAt = new Date(
      Date.now() - orderDef.hoursAgo * 60 * 60 * 1000,
    ).toISOString();

    const orderId = nanoid();
    db.insert(orders)
      .values({
        id: orderId,
        tenantId,
        tableNumber: orderDef.tableNumber,
        status: orderDef.status,
        total: finalTotal,
        discountAmount: discount,
        promoCodeId: orderDef.promoCodeId ?? null,
        createdAt,
        updatedAt: createdAt,
      })
      .run();

    for (const item of orderDef.items) {
      db.insert(orderItems)
        .values({
          id: nanoid(),
          orderId,
          menuItemId: itemIds[item.name],
          name: item.name,
          price: priceLookup[item.name],
          quantity: item.quantity,
          createdAt,
        })
        .run();
    }
  }

  console.log(`Created ${analyticsOrders.length} additional analytics orders`);

  // =================================================================
  // SECOND TENANT: Sakura Sushi (same owner email for multi-restaurant demo)
  // =================================================================

  const sakuraTenantId = nanoid();
  const sakuraNow = new Date().toISOString();

  const sakuraSettings = JSON.stringify({
    brandColor: '#be185d',
    preset: 'fine-dining',
    fontFamily: 'Playfair Display',
    borderRadius: 'rounded',
    surfaceStyle: 'glass',
    coverImageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=128&q=80',
    operatingHours: [
      { day: 0, open: '11:00', close: '21:00' },
      { day: 1, open: '11:30', close: '22:00' },
      { day: 2, open: '11:30', close: '22:00' },
      { day: 3, open: '11:30', close: '22:00' },
      { day: 4, open: '11:30', close: '22:00' },
      { day: 5, open: '11:30', close: '23:00' },
      { day: 6, open: '11:00', close: '23:00' },
    ],
  });

  db.insert(tenants)
    .values({
      id: sakuraTenantId,
      name: 'Sakura Sushi',
      slug: 'sakura',
      settings: sakuraSettings,
      isActive: 1,
      createdAt: sakuraNow,
      updatedAt: sakuraNow,
    })
    .run();

  console.log('Created tenant: Sakura Sushi (sakura)');

  // Same owner email — this enables multi-restaurant switching
  db.insert(staff)
    .values({
      id: nanoid(),
      tenantId: sakuraTenantId,
      email: 'demo@example.com',
      passwordHash,
      name: 'Demo Owner',
      role: 'owner',
      isActive: 1,
      createdAt: sakuraNow,
      updatedAt: sakuraNow,
    })
    .run();

  console.log('Created owner for Sakura: demo@example.com');

  // --- Sakura categories ---
  const sakuraCategoryData = [
    { name: 'Starters', sortOrder: 0 },
    { name: 'Sushi Rolls', sortOrder: 1 },
    { name: 'Ramen', sortOrder: 2 },
    { name: 'Drinks', sortOrder: 3 },
  ];

  const sakuraCatIds: Record<string, string> = {};
  for (const cat of sakuraCategoryData) {
    const id = nanoid();
    sakuraCatIds[cat.name] = id;
    db.insert(menuCategories)
      .values({
        id,
        tenantId: sakuraTenantId,
        name: cat.name,
        sortOrder: cat.sortOrder,
        isActive: 1,
        createdAt: sakuraNow,
        updatedAt: sakuraNow,
      })
      .run();
  }

  // --- Sakura menu items ---
  const sakuraItemDefs: ItemDef[] = [
    // Starters
    { name: 'Edamame', description: 'Steamed soybeans with sea salt', price: 7.0, category: 'Starters', sortOrder: 0, imageUrl: 'https://images.unsplash.com/photo-1564093497595-593b96d80571?w=400&q=80', tags: 'vegetarian,vegan,gluten-free' },
    { name: 'Gyoza', description: 'Pan-fried pork dumplings (6 pcs)', price: 12.0, category: 'Starters', sortOrder: 1, isFeatured: 1, imageUrl: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&q=80' },
    { name: 'Miso Soup', description: 'Traditional soup with tofu and wakame', price: 6.5, category: 'Starters', sortOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1607301405390-d831c242f59b?w=400&q=80', tags: 'vegetarian' },
    // Sushi Rolls
    { name: 'Salmon Nigiri', description: 'Fresh salmon over pressed rice (2 pcs)', price: 9.0, category: 'Sushi Rolls', sortOrder: 0, isFeatured: 1, imageUrl: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&q=80', tags: 'gluten-free' },
    { name: 'Dragon Roll', description: 'Eel, avocado, cucumber topped with avocado', price: 18.0, category: 'Sushi Rolls', sortOrder: 1, imageUrl: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=400&q=80', tags: 'popular' },
    { name: 'Spicy Tuna Roll', description: 'Tuna, spicy mayo, cucumber (8 pcs)', price: 15.0, category: 'Sushi Rolls', sortOrder: 2, isFeatured: 1, imageUrl: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&q=80', tags: 'spicy,popular' },
    { name: 'Vegetable Roll', description: 'Avocado, cucumber, carrot, asparagus', price: 11.0, category: 'Sushi Rolls', sortOrder: 3, imageUrl: 'https://images.unsplash.com/photo-1559410545-0bdcd187e0a6?w=400&q=80', tags: 'vegetarian,vegan' },
    { name: 'Rainbow Roll', description: 'California roll topped with assorted sashimi', price: 22.0, category: 'Sushi Rolls', sortOrder: 4, imageUrl: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=400&q=80', tags: 'popular' },
    // Ramen
    { name: 'Tonkotsu Ramen', description: 'Rich pork bone broth with chashu, egg, nori', price: 19.0, category: 'Ramen', sortOrder: 0, isFeatured: 1, imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80', tags: 'popular' },
    { name: 'Miso Ramen', description: 'Miso-based broth with corn, butter, bean sprouts', price: 17.5, category: 'Ramen', sortOrder: 1, imageUrl: 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=400&q=80' },
    { name: 'Shoyu Ramen', description: 'Soy sauce broth with bamboo shoots and nori', price: 16.5, category: 'Ramen', sortOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=400&q=80' },
    // Drinks
    { name: 'Green Tea', description: 'Hot Japanese sencha', price: 4.0, category: 'Drinks', sortOrder: 0, tags: 'vegan,gluten-free' },
    { name: 'Sake (Hot)', description: 'House sake, 180ml carafe', price: 12.0, category: 'Drinks', sortOrder: 1, imageUrl: 'https://images.unsplash.com/photo-1553484604-9f524520c793?w=400&q=80', tags: 'vegan,gluten-free' },
    { name: 'Ramune Soda', description: 'Japanese marble soda', price: 5.5, category: 'Drinks', sortOrder: 2, tags: 'vegan' },
    { name: 'Asahi Beer', description: 'Japanese lager, 500ml', price: 9.0, category: 'Drinks', sortOrder: 3, imageUrl: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&q=80', tags: 'vegan' },
  ];

  const sakuraItemIds: Record<string, string> = {};
  for (const item of sakuraItemDefs) {
    const id = nanoid();
    sakuraItemIds[item.name] = id;
    db.insert(menuItems)
      .values({
        id,
        tenantId: sakuraTenantId,
        categoryId: sakuraCatIds[item.category],
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl ?? null,
        tags: item.tags ?? null,
        allergens: item.allergens ?? null,
        isAvailable: 1,
        isFeatured: item.isFeatured ?? 0,
        sortOrder: item.sortOrder,
        isActive: 1,
        createdAt: sakuraNow,
        updatedAt: sakuraNow,
      })
      .run();
  }

  console.log(`Created 4 Sakura categories with ${sakuraItemDefs.length} items`);

  // --- Sakura modifier groups ---
  const sakuraSpiceGroup = db.insert(modifierGroups).values({
    id: nanoid(),
    tenantId: sakuraTenantId,
    name: 'Spice Level',
    minSelections: 1,
    maxSelections: 1,
    sortOrder: 0,
    isActive: 1,
    createdAt: sakuraNow,
    updatedAt: sakuraNow,
  }).returning().get();

  db.insert(modifierOptions).values([
    { id: nanoid(), groupId: sakuraSpiceGroup.id, name: 'Mild', priceDelta: 0, isDefault: 1, sortOrder: 0, isActive: 1, createdAt: sakuraNow, updatedAt: sakuraNow },
    { id: nanoid(), groupId: sakuraSpiceGroup.id, name: 'Medium', priceDelta: 0, isDefault: 0, sortOrder: 1, isActive: 1, createdAt: sakuraNow, updatedAt: sakuraNow },
    { id: nanoid(), groupId: sakuraSpiceGroup.id, name: 'Hot', priceDelta: 0, isDefault: 0, sortOrder: 2, isActive: 1, createdAt: sakuraNow, updatedAt: sakuraNow },
    { id: nanoid(), groupId: sakuraSpiceGroup.id, name: 'Extra Hot', priceDelta: 0.5, isDefault: 0, sortOrder: 3, isActive: 1, createdAt: sakuraNow, updatedAt: sakuraNow },
  ]).run();

  const ramenExtrasGroup = db.insert(modifierGroups).values({
    id: nanoid(),
    tenantId: sakuraTenantId,
    name: 'Ramen Extras',
    minSelections: 0,
    maxSelections: 3,
    sortOrder: 1,
    isActive: 1,
    createdAt: sakuraNow,
    updatedAt: sakuraNow,
  }).returning().get();

  db.insert(modifierOptions).values([
    { id: nanoid(), groupId: ramenExtrasGroup.id, name: 'Extra Chashu', priceDelta: 3.0, isDefault: 0, sortOrder: 0, isActive: 1, createdAt: sakuraNow, updatedAt: sakuraNow },
    { id: nanoid(), groupId: ramenExtrasGroup.id, name: 'Extra Egg', priceDelta: 2.0, isDefault: 0, sortOrder: 1, isActive: 1, createdAt: sakuraNow, updatedAt: sakuraNow },
    { id: nanoid(), groupId: ramenExtrasGroup.id, name: 'Extra Noodles', priceDelta: 2.5, isDefault: 0, sortOrder: 2, isActive: 1, createdAt: sakuraNow, updatedAt: sakuraNow },
    { id: nanoid(), groupId: ramenExtrasGroup.id, name: 'Extra Corn', priceDelta: 1.5, isDefault: 0, sortOrder: 3, isActive: 1, createdAt: sakuraNow, updatedAt: sakuraNow },
  ]).run();

  // Link modifiers to ramen items
  db.insert(menuItemModifierGroups).values([
    { menuItemId: sakuraItemIds['Tonkotsu Ramen'], modifierGroupId: sakuraSpiceGroup.id, sortOrder: 0 },
    { menuItemId: sakuraItemIds['Tonkotsu Ramen'], modifierGroupId: ramenExtrasGroup.id, sortOrder: 1 },
    { menuItemId: sakuraItemIds['Miso Ramen'], modifierGroupId: sakuraSpiceGroup.id, sortOrder: 0 },
    { menuItemId: sakuraItemIds['Miso Ramen'], modifierGroupId: ramenExtrasGroup.id, sortOrder: 1 },
    { menuItemId: sakuraItemIds['Shoyu Ramen'], modifierGroupId: sakuraSpiceGroup.id, sortOrder: 0 },
    { menuItemId: sakuraItemIds['Shoyu Ramen'], modifierGroupId: ramenExtrasGroup.id, sortOrder: 1 },
    { menuItemId: sakuraItemIds['Spicy Tuna Roll'], modifierGroupId: sakuraSpiceGroup.id, sortOrder: 0 },
  ]).run();

  console.log('Created 2 Sakura modifier groups with options');

  // --- Sakura sample orders ---
  const sakuraPriceLookup: Record<string, number> = {};
  for (const item of sakuraItemDefs) {
    sakuraPriceLookup[item.name] = item.price;
  }

  const sakuraOrderDefs: OrderDef[] = [
    {
      tableNumber: '1',
      status: 'pending',
      minutesAgo: 8,
      items: [
        { name: 'Edamame', quantity: 1 },
        { name: 'Spicy Tuna Roll', quantity: 2 },
      ],
    },
    {
      tableNumber: '3',
      status: 'confirmed',
      minutesAgo: 20,
      items: [
        { name: 'Gyoza', quantity: 1 },
        { name: 'Tonkotsu Ramen', quantity: 2, modifiers: [{ name: 'Extra Chashu', price: 3.00 }] },
        { name: 'Asahi Beer', quantity: 2 },
      ],
    },
    {
      tableNumber: '5',
      status: 'preparing',
      minutesAgo: 35,
      items: [
        { name: 'Dragon Roll', quantity: 1 },
        { name: 'Rainbow Roll', quantity: 1 },
        { name: 'Sake (Hot)', quantity: 1 },
      ],
    },
    {
      tableNumber: '2',
      status: 'delivered',
      minutesAgo: 55,
      items: [
        { name: 'Miso Soup', quantity: 2 },
        { name: 'Salmon Nigiri', quantity: 4 },
        { name: 'Miso Ramen', quantity: 1 },
        { name: 'Green Tea', quantity: 2 },
      ],
    },
  ];

  for (const orderDef of sakuraOrderDefs) {
    const total = orderDef.items.reduce(
      (sum, item) => {
        const modifierTotal = (item.modifiers ?? []).reduce((ms, m) => ms + m.price, 0);
        return sum + (sakuraPriceLookup[item.name] + modifierTotal) * item.quantity;
      },
      0,
    );

    const createdAt = new Date(
      Date.now() - orderDef.minutesAgo * 60 * 1000,
    ).toISOString();

    const orderId = nanoid();
    db.insert(orders)
      .values({
        id: orderId,
        tenantId: sakuraTenantId,
        tableNumber: orderDef.tableNumber,
        status: orderDef.status,
        total,
        createdAt,
        updatedAt: createdAt,
      })
      .run();

    for (const item of orderDef.items) {
      const modifierTotal = (item.modifiers ?? []).reduce((ms, m) => ms + m.price, 0);
      db.insert(orderItems)
        .values({
          id: nanoid(),
          orderId,
          menuItemId: sakuraItemIds[item.name],
          name: item.name,
          price: sakuraPriceLookup[item.name] + modifierTotal,
          quantity: item.quantity,
          modifiersJson: item.modifiers ? JSON.stringify(item.modifiers) : null,
          createdAt,
        })
        .run();
    }
  }

  console.log(`Created ${sakuraOrderDefs.length} Sakura sample orders`);
  console.log('');
  console.log('Done! Login with: demo@example.com / password123');
  console.log('  - Demo Restaurant (demo)');
  console.log('  - Sakura Sushi (sakura)');
}

try {
  seed();
} catch (err) {
  console.error('Seed failed:', err);
  process.exit(1);
}
