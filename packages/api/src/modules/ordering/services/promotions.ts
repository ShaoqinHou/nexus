import { eq, and, desc } from 'drizzle-orm';
import { promotions, promoCodes } from '../../../db/schema.js';
import type { DrizzleDB } from '../../../db/client.js';
import type { Promotion, PromotionType } from '../../../db/schema.js';

// --- Promotion Service ---

export function getPromotions(db: DrizzleDB, tenantId: string) {
  const promoList = db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.tenantId, tenantId),
        eq(promotions.isActive, 1)
      )
    )
    .orderBy(desc(promotions.createdAt))
    .all();

  return promoList.map((promo) => {
    const codes = db
      .select()
      .from(promoCodes)
      .where(
        and(
          eq(promoCodes.promotionId, promo.id),
          eq(promoCodes.tenantId, tenantId),
          eq(promoCodes.isActive, 1)
        )
      )
      .all();

    return { ...promo, codes };
  });
}

export function createPromotion(
  db: DrizzleDB,
  tenantId: string,
  data: {
    name: string;
    description?: string;
    type: PromotionType;
    discountValue: number;
    minOrderAmount?: number;
    applicableCategories?: string[];
    startsAt: string;
    endsAt?: string;
    maxUses?: number;
  }
) {
  return db
    .insert(promotions)
    .values({
      tenantId,
      name: data.name,
      description: data.description ?? null,
      type: data.type,
      discountValue: data.discountValue,
      minOrderAmount: data.minOrderAmount ?? null,
      applicableCategories: data.applicableCategories
        ? JSON.stringify(data.applicableCategories)
        : null,
      startsAt: data.startsAt,
      endsAt: data.endsAt ?? null,
      maxUses: data.maxUses ?? null,
    })
    .returning()
    .get();
}

export function updatePromotion(
  db: DrizzleDB,
  tenantId: string,
  promoId: string,
  data: {
    name?: string;
    description?: string;
    type?: PromotionType;
    discountValue?: number;
    minOrderAmount?: number | null;
    applicableCategories?: string[] | null;
    startsAt?: string;
    endsAt?: string | null;
    maxUses?: number | null;
    isActive?: number;
  }
) {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.discountValue !== undefined) updateData.discountValue = data.discountValue;
  if (data.minOrderAmount !== undefined) updateData.minOrderAmount = data.minOrderAmount;
  if (data.applicableCategories !== undefined) {
    updateData.applicableCategories = data.applicableCategories
      ? JSON.stringify(data.applicableCategories)
      : null;
  }
  if (data.startsAt !== undefined) updateData.startsAt = data.startsAt;
  if (data.endsAt !== undefined) updateData.endsAt = data.endsAt;
  if (data.maxUses !== undefined) updateData.maxUses = data.maxUses;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return db
    .update(promotions)
    .set(updateData)
    .where(
      and(
        eq(promotions.id, promoId),
        eq(promotions.tenantId, tenantId)
      )
    )
    .returning()
    .get();
}

export function deletePromotion(db: DrizzleDB, tenantId: string, promoId: string) {
  return db
    .update(promotions)
    .set({ isActive: 0, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(promotions.id, promoId),
        eq(promotions.tenantId, tenantId)
      )
    )
    .returning()
    .get();
}

export function getPromoCodes(db: DrizzleDB, tenantId: string, promotionId?: string) {
  const conditions = [
    eq(promoCodes.tenantId, tenantId),
    eq(promoCodes.isActive, 1),
  ];
  if (promotionId) {
    conditions.push(eq(promoCodes.promotionId, promotionId));
  }

  return db
    .select()
    .from(promoCodes)
    .where(and(...conditions))
    .all();
}

export function createPromoCode(
  db: DrizzleDB,
  tenantId: string,
  data: { promotionId: string; code: string; usageLimit?: number }
) {
  // Verify promotion exists and belongs to tenant
  const promo = db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.id, data.promotionId),
        eq(promotions.tenantId, tenantId),
        eq(promotions.isActive, 1)
      )
    )
    .get();

  if (!promo) {
    return { error: 'Promotion not found' as const };
  }

  // Check code uniqueness within tenant
  const existing = db
    .select()
    .from(promoCodes)
    .where(
      and(
        eq(promoCodes.tenantId, tenantId),
        eq(promoCodes.code, data.code.toUpperCase()),
        eq(promoCodes.isActive, 1)
      )
    )
    .get();

  if (existing) {
    return { error: 'Promo code already exists for this tenant' as const };
  }

  const code = db
    .insert(promoCodes)
    .values({
      tenantId,
      promotionId: data.promotionId,
      code: data.code.toUpperCase(),
      usageLimit: data.usageLimit ?? null,
    })
    .returning()
    .get();

  return { data: code };
}

export function deletePromoCode(db: DrizzleDB, tenantId: string, codeId: string) {
  return db
    .update(promoCodes)
    .set({ isActive: 0 })
    .where(
      and(
        eq(promoCodes.id, codeId),
        eq(promoCodes.tenantId, tenantId)
      )
    )
    .returning()
    .get();
}

export function validatePromoCode(
  db: DrizzleDB,
  tenantId: string,
  code: string
): { data: { promotion: Promotion; promoCode: { id: string; code: string } } } | { error: string } {
  const promoCode = db
    .select()
    .from(promoCodes)
    .where(
      and(
        eq(promoCodes.tenantId, tenantId),
        eq(promoCodes.code, code.toUpperCase()),
        eq(promoCodes.isActive, 1)
      )
    )
    .get();

  if (!promoCode) {
    return { error: 'Invalid promo code' };
  }

  // Check usage limit
  if (promoCode.usageLimit !== null && promoCode.usageCount >= promoCode.usageLimit) {
    return { error: 'Promo code usage limit reached' };
  }

  // Get the associated promotion
  const promotion = db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.id, promoCode.promotionId),
        eq(promotions.tenantId, tenantId),
        eq(promotions.isActive, 1)
      )
    )
    .get();

  if (!promotion) {
    return { error: 'Promotion is no longer active' };
  }

  // Check promotion date range
  const now = new Date().toISOString();
  if (promotion.startsAt > now) {
    return { error: 'Promotion has not started yet' };
  }
  if (promotion.endsAt && promotion.endsAt < now) {
    return { error: 'Promotion has expired' };
  }

  // Check promotion max uses
  if (promotion.maxUses !== null && promotion.currentUses >= promotion.maxUses) {
    return { error: 'Promotion usage limit reached' };
  }

  return {
    data: {
      promotion,
      promoCode: { id: promoCode.id, code: promoCode.code },
    },
  };
}

export function applyPromotion(
  promotion: Promotion,
  orderTotal: number,
  categoryIds?: string[]
): number {
  // If promotion is restricted to specific categories, check overlap
  if (promotion.applicableCategories) {
    const applicableIds: string[] = JSON.parse(promotion.applicableCategories);
    if (categoryIds && categoryIds.length > 0) {
      const hasOverlap = categoryIds.some((id) => applicableIds.includes(id));
      if (!hasOverlap) {
        return 0; // No applicable items
      }
    }
  }

  // Check minimum order amount
  if (promotion.minOrderAmount !== null && orderTotal < promotion.minOrderAmount) {
    return 0;
  }

  let discount: number;
  if (promotion.type === 'percentage') {
    discount = orderTotal * (promotion.discountValue / 100);
  } else {
    // fixed_amount
    discount = promotion.discountValue;
  }

  // Never exceed order total
  discount = Math.min(discount, orderTotal);

  // Round to 2 decimal places
  return Math.round(discount * 100) / 100;
}
