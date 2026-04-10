import { apiClient } from '@web/lib/api';

export const TOUR_MARKER = '__nexus_tour__';

interface Category {
  id: string;
  description?: string | null;
}

interface MenuItem {
  id: string;
  description?: string | null;
}

/**
 * Delete all categories and items that were created during a tour run.
 * Tour-created items are tagged with TOUR_MARKER in their description field.
 * Safe to call multiple times — only removes marked items.
 */
export async function cleanupStaffTourData(tenantSlug: string): Promise<void> {
  try {
    // Remove tour-created items first (before deleting their categories)
    const itemsRes = await apiClient.get<{ data: MenuItem[] }>(
      `/t/${tenantSlug}/ordering/items`,
    );
    for (const item of itemsRes.data) {
      if (item.description === TOUR_MARKER) {
        await apiClient.delete(`/t/${tenantSlug}/ordering/items/${item.id}`);
      }
    }

    // Then remove tour-created categories
    const catsRes = await apiClient.get<{ data: Category[] }>(
      `/t/${tenantSlug}/ordering/categories`,
    );
    for (const cat of catsRes.data) {
      if (cat.description === TOUR_MARKER) {
        await apiClient.delete(`/t/${tenantSlug}/ordering/categories/${cat.id}`);
      }
    }
  } catch {
    // Cleanup is best-effort — never block the UI on failure
  }
}
