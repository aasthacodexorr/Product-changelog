import { validateExport } from './schema';
import type { ChangelogExport, ChangelogUpdate, Dataset, Product, Result } from './types';
import { allTypes, canonicalType, customTypesFrom } from './update-types';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

/** Parses and fully validates import text. Never touches stored data. */
export function parseImport(text: string): Result<ChangelogExport> {
  if (text.trim() === '') return { ok: false, errors: ['The file is empty.'] };
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, errors: ['The file is larger than 5 MB.'] };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: [`The file is not valid JSON (${e instanceof Error ? e.message : 'parse error'}).`] };
  }
  return validateExport(json);
}

export interface UpdateConflict {
  existing: ChangelogUpdate;
  incoming: ChangelogUpdate;
  fields: string[];
}

export interface ProductConflict {
  existing: Product;
  incoming: Product;
}

export interface MergePlan {
  newProducts: Product[];
  newUpdates: ChangelogUpdate[];
  /** Custom types in the file that the working dataset does not have yet. */
  newTypes: string[];
  identicalProducts: number;
  identicalUpdates: number;
  productConflicts: ProductConflict[];
  updateConflicts: UpdateConflict[];
  warnings: string[];
}

const UPDATE_FIELDS: (keyof ChangelogUpdate)[] = [
  'productId', 'moduleName', 'title', 'description', 'releaseDate', 'type', 'version', 'proofUrl',
];

/** Compares incoming data to the current working dataset without changing anything. */
export function planMerge(current: Dataset, incoming: Dataset): MergePlan {
  const plan: MergePlan = {
    newProducts: [], newUpdates: [], newTypes: [], identicalProducts: 0, identicalUpdates: 0,
    productConflicts: [], updateConflicts: [], warnings: [],
  };
  const curProducts = new Map(current.products.map((p) => [p.id, p]));
  const curUpdates = new Map(current.updates.map((u) => [u.id, u]));
  const curNames = new Map(current.products.map((p) => [p.name.toLowerCase(), p.id]));

  for (const p of incoming.products) {
    const ex = curProducts.get(p.id);
    if (!ex) {
      plan.newProducts.push(p);
      const sameName = curNames.get(p.name.toLowerCase());
      if (sameName) {
        plan.warnings.push(`Product "${p.name}" has a new ID but the same name as an existing product (${sameName}). Both will be kept.`);
      }
    } else if (ex.name === p.name) plan.identicalProducts++;
    else plan.productConflicts.push({ existing: ex, incoming: p });
  }

  const curTypes = allTypes(current);
  for (const t of allTypes(incoming)) {
    if (!canonicalType(t, curTypes)) plan.newTypes.push(t);
  }

  for (const u of incoming.updates) {
    const ex = curUpdates.get(u.id);
    if (!ex) plan.newUpdates.push(u);
    else {
      const fields = UPDATE_FIELDS.filter((f) => (ex[f] ?? '') !== (u[f] ?? ''));
      if (fields.length) plan.updateConflicts.push({ existing: ex, incoming: u, fields });
      else plan.identicalUpdates++;
    }
  }
  return plan;
}

/**
 * Applies a merge: adds only new records. Records whose IDs already exist are
 * never overwritten, so existing (possibly edited) data is always preserved.
 */
export function applyMerge(current: Dataset, plan: MergePlan): Dataset {
  const types = allTypes(current).concat(plan.newTypes);
  // Reuse the existing spelling of a type if the file differs only in case/spacing.
  const updates = plan.newUpdates.map((u) => ({ ...u, type: canonicalType(u.type, types) ?? u.type }));
  return {
    products: [...current.products, ...plan.newProducts],
    updates: [...current.updates, ...updates],
    customTypes: customTypesFrom([...current.customTypes, ...plan.newTypes]),
  };
}

export function describeFields(fields: string[]): string {
  return fields.join(', ');
}
