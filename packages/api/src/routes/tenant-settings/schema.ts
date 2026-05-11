import { z } from 'zod';
import { CUISINE_THEME_IDS } from '@nexus/shared';

export const operatingHoursEntrySchema = z.object({
  day: z.number().int().min(0).max(6),
  open: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format'),
  close: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format'),
});

export const updateTenantSettingsSchema = z.object({
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').optional().or(z.literal('')),
  logoUrl: z.string().url().optional().or(z.literal('')),
  coverImageUrl: z.string().url().optional().or(z.literal('')),
  theme: z.enum(CUISINE_THEME_IDS).optional().or(z.literal('')),
  preset: z.string().optional().or(z.literal('')),
  fontFamily: z.string().optional(),
  borderRadius: z.enum(['sharp', 'rounded', 'pill']).optional(),
  surfaceStyle: z.enum(['flat', 'subtle', 'elevated']).optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  operatingHours: z.array(operatingHoursEntrySchema).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  taxInclusive: z.boolean().optional(),
  taxLabel: z.string().max(20).optional(),
  primaryLocale: z.string().min(2).max(5).optional(),
  supportedLocales: z.array(z.string().min(2).max(5)).optional(),
  lastOrderMinutesBefore: z.number().int().min(0).max(120).optional(),
  paymentModel: z.enum(['pre_pay', 'post_pay']).optional(),
  kitchenLocale: z.string().min(2).max(5).optional(),
});

export type TenantSettingsUpdate = z.infer<typeof updateTenantSettingsSchema>;
export type TenantSettingsRecord = Record<string, unknown>;
