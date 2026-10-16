import { DEFAULT_TYPES, LIMITS, type Dataset, type Result } from './types';

/** Trims and collapses internal whitespace. */
export function normalizeTypeName(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

const key = (s: string) => normalizeTypeName(s).toLowerCase();

/**
 * Every type available in the dropdown: defaults, then custom types, then any
 * type used by an update that isn't listed (so imported data never loses a type).
 */
export function allTypes(ds: Dataset): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (t: string) => {
    const k = key(t);
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(normalizeTypeName(t));
    }
  };
  DEFAULT_TYPES.forEach(add);
  ds.customTypes.forEach(add);
  ds.updates.forEach((u) => add(u.type));
  return out;
}

/** Returns the canonical spelling for `name` among `types`, if present (case-insensitive). */
export function canonicalType(name: string, types: string[]): string | undefined {
  const k = key(name);
  return types.find((t) => key(t) === k);
}

/** Custom types needed to represent `types` (everything that is not a default). */
export function customTypesFrom(types: string[]): string[] {
  const defaults = new Set(DEFAULT_TYPES.map(key));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of types) {
    const k = key(t);
    if (!k || defaults.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(normalizeTypeName(t));
  }
  return out;
}

export function addCustomType(ds: Dataset, raw: string): Result<{ dataset: Dataset; type: string }> {
  const name = normalizeTypeName(raw);
  if (!name) return { ok: false, errors: ['Type name is required.'] };
  if (name.length > LIMITS.typeName) {
    return { ok: false, errors: [`Type name must be ${LIMITS.typeName} characters or fewer.`] };
  }
  const existing = canonicalType(name, allTypes(ds));
  if (existing) return { ok: false, errors: [`A type named "${existing}" already exists.`] };
  if (ds.customTypes.length >= LIMITS.customTypes) {
    return { ok: false, errors: [`You can have at most ${LIMITS.customTypes} custom types.`] };
  }
  return { ok: true, errors: [], value: { type: name, dataset: { ...ds, customTypes: [...ds.customTypes, name] } } };
}
