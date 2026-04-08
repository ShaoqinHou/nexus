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

  // --- Idempotency: delete existing demo tenant and all its data ---
  const existing = db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, 'demo'))
    .get();

  if (existing) {
    console.log('Existing demo tenant found — removing...');

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
  }

  const itemDefs: ItemDef[] = [
    // Starters
    { name: 'Garlic Bread', description: 'Crispy bread with garlic butter', price: 8.5, category: 'Starters', sortOrder: 0, imageUrl: 'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=400&q=80', tags: 'vegetarian' },
    { name: 'Spring Rolls', description: 'Vegetable spring rolls with sweet chili', price: 10.0, category: 'Starters', sortOrder: 1, isFeatured: 1, imageUrl: 'https://images.unsplash.com/photo-1548507235-a25a6c28bda8?w=400&q=80', tags: 'vegetarian,vegan' },
    { name: 'Soup of the Day', description: "Ask your server for today's selection", price: 9.5, category: 'Starters', sortOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80' },
    // Mains
    { name: 'Margherita Pizza', description: 'Classic tomato, mozzarella, fresh basil', price: 18.0, category: 'Mains', sortOrder: 0, isFeatured: 1, imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=80', tags: 'vegetarian,popular' },
    { name: 'Fish & Chips', description: 'Beer-battered fish with hand-cut chips', price: 22.5, category: 'Mains', sortOrder: 1, imageUrl: 'https://images.unsplash.com/photo-1580217593608-61931cefc821?w=400&q=80' },
    { name: 'Chicken Parmesan', description: 'Crumbed chicken with napoli sauce', price: 24.0, category: 'Mains', sortOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=400&q=80' },
    { name: 'Beef Burger', description: 'Angus beef patty with lettuce, tomato, cheese', price: 19.5, category: 'Mains', sortOrder: 3, isFeatured: 1, imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80', tags: 'popular' },
    { name: 'Pad Thai', description: 'Stir-fried rice noodles with prawns', price: 17.0, category: 'Mains', sortOrder: 4, imageUrl: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400&q=80', tags: 'spicy' },
    // Desserts
    { name: 'Tiramisu', description: 'Classic Italian coffee dessert', price: 12.0, category: 'Desserts', sortOrder: 0, isFeatured: 1, imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=80', tags: 'vegetarian' },
    { name: 'Cheesecake', description: 'New York style with berry coulis', price: 11.5, category: 'Desserts', sortOrder: 1, imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&q=80', tags: 'vegetarian' },
    { name: 'Ice Cream Sundae', description: 'Three scoops with chocolate sauce', price: 8.0, category: 'Desserts', sortOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=80', tags: 'vegetarian,gluten-free' },
    // Drinks
    { name: 'Cola', description: '330ml can', price: 4.5, category: 'Drinks', sortOrder: 0 },
    { name: 'Fresh Lemonade', description: 'House-made with mint', price: 5.0, category: 'Drinks', sortOrder: 1, imageUrl: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&q=80', tags: 'vegan,gluten-free' },
    { name: 'Craft Beer', description: 'Local pale ale, 500ml', price: 8.0, category: 'Drinks', sortOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&q=80', tags: 'vegan' },
    { name: 'House Wine', description: 'Red or white, 150ml glass', price: 12.0, category: 'Drinks', sortOrder: 3, imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80', tags: 'vegan,gluten-free' },
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

  // --- Create sample orders ---
  interface OrderDef {
    tableNumber: string;
    status: 'pending' | 'confirmed' | 'preparing' | 'delivered';
    minutesAgo: number;
    items: Array<{ name: string; quantity: number }>;
  }

  const orderDefs: OrderDef[] = [
    {
      tableNumber: '1',
      status: 'pending',
      minutesAgo: 5,
      items: [
        { name: 'Garlic Bread', quantity: 1 },
        { name: 'Margherita Pizza', quantity: 1 },
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
        { name: 'Beef Burger', quantity: 2 },
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
    // Calculate total
    const total = orderDef.items.reduce(
      (sum, item) => sum + priceLookup[item.name] * item.quantity,
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

    // Insert order items with snapshot name + price
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

  console.log(`Created ${orderDefs.length} sample orders`);
  console.log('Done! Login with: demo@example.com / password123 / demo');
}

try {
  seed();
} catch (err) {
  console.error('Seed failed:', err);
  process.exit(1);
}
