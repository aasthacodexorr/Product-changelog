import type { ChangelogUpdate, Product } from './types';

const norm = (s: string) => s.trim().toLowerCase();

/** Read-only filter: updates whose product name contains the query (case-insensitive). */
export function filterUpdatesByProduct(
  updates: ChangelogUpdate[],
  products: Product[],
  query: string,
): ChangelogUpdate[] {
  const q = norm(query);
  if (!q) return updates;
  const ids = new Set(products.filter((p) => p.name.toLowerCase().includes(q)).map((p) => p.id));
  return updates.filter((u) => ids.has(u.productId));
}

/** Filter updates by product name query AND selected product types (multi-select). */
export function filterUpdates(
  updates: ChangelogUpdate[],
  products: Product[],
  query: string,
  selectedTypes: string[] = [],
): ChangelogUpdate[] {
  let result = filterUpdatesByProduct(updates, products, query);
  if (selectedTypes.length > 0) {
    const selectedNormalized = new Set(selectedTypes.map(norm));
    result = result.filter((u) => selectedNormalized.has(norm(u.type || '')));
  }
  return result;
}

/** Filter updates by selected product IDs. */
export function filterUpdatesByProducts(
  updates: ChangelogUpdate[],
  selectedProductIds: string[],
): ChangelogUpdate[] {
  if (selectedProductIds.length === 0) return updates;
  const selectedSet = new Set(selectedProductIds);
  return updates.filter((u) => selectedSet.has(u.productId));
}

/** Product names matching the query, prefix matches first. */
export function suggestProducts(products: Product[], query: string, limit = 6): Product[] {
  const q = norm(query);
  if (!q) return [];
  return products
    .filter((p) => p.name.toLowerCase().includes(q))
    .sort((a, b) => {
      const ap = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bp = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      return ap - bp || a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}
